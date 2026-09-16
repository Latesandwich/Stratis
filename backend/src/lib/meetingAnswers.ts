import type { QueryResultRow } from "pg";
import type { AnswerInput, SavedAnswer } from "@shared/types";

const MAX_ANSWER_CHARS = 1_000;
const MAX_QUESTION_CHARS = 1_000;
const MAX_ID_CHARS = 128;
const MAX_SPEAKER_CHARS = 120;

export interface TransactionClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
}

export interface MeetingAnswerDatabase {
  tx<T>(fn: (client: TransactionClient) => Promise<T>): Promise<T>;
}

export interface MeetingAnswerActor {
  id: string;
  orgId: string;
  role: "facilitator";
}

export interface MeetingAnswerOptions {
  db?: MeetingAnswerDatabase;
  newId?: (prefix: string) => string;
  now?: () => string;
}

export class MeetingAnswerError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MeetingAnswerError";
    this.status = status;
  }
}

interface SessionRow extends QueryResultRow {
  id: string;
  facilitator_id: string;
  org_id: string;
}

interface ExistingAnswerRow extends QueryResultRow {
  id: string;
  session_id: string;
  question_id: string;
  origin: AnswerInput["origin"];
  question_text: string;
  text: string;
  actor_id: string | null;
  created_at: string | Date;
  transcript_id: string;
  speaker: string;
}

interface CardRow extends QueryResultRow {
  id: string;
  session_id: string;
  question_text: string;
  answered: boolean;
  answered_by: "auto" | "manual" | null;
}

function fail(status: number, message: string): never {
  throw new MeetingAnswerError(status, message);
}

function validateInput(input: AnswerInput): void {
  if (!input.sessionId || input.sessionId.length > MAX_ID_CHARS) {
    fail(400, "sessionId is required");
  }
  if (!input.questionId || input.questionId.length > MAX_ID_CHARS) {
    fail(400, "questionId is required");
  }
  if (!input.requestId || input.requestId.length > MAX_ID_CHARS) {
    fail(400, "requestId is required");
  }
  if (input.text.trim().length === 0) fail(400, "answer text is required");
  if (input.text.length > MAX_ANSWER_CHARS) {
    fail(400, `answer must be at most ${MAX_ANSWER_CHARS} characters`);
  }
  if (input.speaker !== undefined && input.speaker.trim().length > MAX_SPEAKER_CHARS) {
    fail(400, `speaker must be at most ${MAX_SPEAKER_CHARS} characters`);
  }
  if (input.origin === "planned") {
    if (!input.plannedQuestionText || input.plannedQuestionText.trim().length === 0) {
      fail(400, "plannedQuestionText is required for a planned question");
    }
    if (input.plannedQuestionText.length > MAX_QUESTION_CHARS) {
      fail(400, `plannedQuestionText must be at most ${MAX_QUESTION_CHARS} characters`);
    }
  }
}

function toSavedAnswer(row: ExistingAnswerRow, created: boolean): SavedAnswer {
  return {
    id: row.id,
    sessionId: row.session_id,
    questionId: row.question_id,
    questionText: row.question_text,
    text: row.text,
    actorId: row.actor_id,
    speaker: row.speaker,
    createdAt: new Date(row.created_at).toISOString(),
    transcriptId: row.transcript_id,
    created,
  };
}

function retryMatches(input: AnswerInput, actor: MeetingAnswerActor, existing: ExistingAnswerRow): boolean {
  const plannedQuestion = input.plannedQuestionText?.trim() ?? null;
  return existing.question_id === input.questionId
    && existing.origin === input.origin
    && existing.text === input.text
    && existing.actor_id === actor.id
    && (input.origin === "ai" || existing.question_text === plannedQuestion);
}

/**
 * Durably records one facilitator answer. The transaction owns every durable
 * fact that makes an answer real: access, question identity, transcript turn,
 * answer row, and (for AI cards) the card state.
 */
export async function saveMeetingAnswer(
  input: AnswerInput,
  actor: MeetingAnswerActor,
  options: MeetingAnswerOptions = {},
): Promise<SavedAnswer> {
  validateInput(input);
  // The database module is loaded only for the production path. Keeping this
  // boundary lazy lets the transaction contract run against an in-memory store
  // in tests without opening a pool or needing a configured database.
  const database = options.db ?? (await import("../db/database.ts")).db;
  const ids = options.newId && options.now ? null : await import("./ids.ts");
  const makeId = options.newId ?? ids!.newId;
  const timestamp = options.now ?? ids!.now;

  return database.tx(async (client) => {
    const sessionResult = await client.query<SessionRow>(
      `SELECT s.id, s.facilitator_id, m.org_id
       FROM sessions s
       JOIN meetings m ON m.id = s.meeting_id
       WHERE s.id = $1
       FOR UPDATE`,
      [input.sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) fail(404, "Session not found");
    if (actor.role !== "facilitator" || session.facilitator_id !== actor.id || session.org_id !== actor.orgId) {
      fail(403, "You do not have access to this session");
    }

    const existingResult = await client.query<ExistingAnswerRow>(
      `SELECT meeting_answers.id, meeting_answers.session_id, meeting_answers.question_id,
              meeting_answers.origin, meeting_answers.question_text, meeting_answers.text,
              meeting_answers.actor_id, meeting_answers.created_at, meeting_answers.transcript_id,
              transcripts.speaker
       FROM meeting_answers
       JOIN transcripts
         ON transcripts.id = meeting_answers.transcript_id
        AND transcripts.session_id = meeting_answers.session_id
       WHERE meeting_answers.session_id = $1 AND meeting_answers.request_id = $2
       FOR UPDATE`,
      [input.sessionId, input.requestId],
    );
    const existing = existingResult.rows[0];
    if (existing) {
      if (!retryMatches(input, actor, existing)) {
        fail(409, "requestId was already used for a different answer");
      }
      return toSavedAnswer(existing, false);
    }

    let questionText: string;
    let cardId: string | null = null;
    if (input.origin === "ai") {
      const cardResult = await client.query<CardRow>(
        `SELECT id, session_id,
                COALESCE(NULLIF(BTRIM(suggested_question), ''), title) AS question_text,
                answered, answered_by
         FROM live_cards
         WHERE id = $1 AND session_id = $2
         FOR UPDATE`,
        [input.questionId, input.sessionId],
      );
      const card = cardResult.rows[0];
      if (!card) fail(404, "Question card not found");
      if (card.answered && card.answered_by !== "auto") {
        fail(409, "Question card has already been answered");
      }
      questionText = card.question_text;
      cardId = card.id;
    } else {
      questionText = input.plannedQuestionText!.trim();
    }

    const createdAt = timestamp();
    const answerId = makeId("answer");
    const transcriptId = makeId("tx");
    const speaker = input.speaker?.trim() || "Facilitator";
    await client.query(
      `INSERT INTO transcripts (id, session_id, speaker, text, timestamp, source, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        transcriptId,
        input.sessionId,
        speaker,
        input.text,
        createdAt,
        "typed_answer",
        JSON.stringify({ actorId: actor.id, answerId }),
      ],
    );
    await client.query(
      `INSERT INTO meeting_answers
         (id, session_id, question_id, origin, question_text, text, actor_id, transcript_id, request_id, live_card_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        answerId,
        input.sessionId,
        input.questionId,
        input.origin,
        questionText,
        input.text,
        actor.id,
        transcriptId,
        input.requestId,
        cardId,
        createdAt,
      ],
    );
    if (cardId) {
      await client.query(
        `UPDATE live_cards
         SET answered = TRUE, answered_by = 'manual', answered_at = $1, state = 'ANSWERED', answer_text = $2
         WHERE id = $3 AND session_id = $4`,
        [createdAt, input.text, cardId, input.sessionId],
      );
    }

    return {
      id: answerId,
      sessionId: input.sessionId,
      questionId: input.questionId,
      questionText,
      text: input.text,
      actorId: actor.id,
      speaker,
      createdAt,
      transcriptId,
      created: true,
    };
  });
}

/**
 * Compatibility path for the older web control that clears a card without a
 * typed answer. It deliberately creates no answer/transcript row; typed saves
 * always use `saveMeetingAnswer` above.
 */
export async function settleAiCardWithoutText(
  sessionId: string,
  cardId: string,
  actor: MeetingAnswerActor,
  options: MeetingAnswerOptions = {},
): Promise<{ cardId: string; questionText: string }> {
  if (!sessionId || !cardId || sessionId.length > MAX_ID_CHARS || cardId.length > MAX_ID_CHARS) {
    fail(400, "sessionId and cardId are required");
  }
  const database = options.db ?? (await import("../db/database.ts")).db;
  const ids = options.now ? null : await import("./ids.ts");
  const timestamp = options.now ?? ids!.now;

  return database.tx(async (client) => {
    const sessionResult = await client.query<SessionRow>(
      `SELECT s.id, s.facilitator_id, m.org_id
       FROM sessions s
       JOIN meetings m ON m.id = s.meeting_id
       WHERE s.id = $1
       FOR UPDATE`,
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) fail(404, "Session not found");
    if (actor.role !== "facilitator" || session.facilitator_id !== actor.id || session.org_id !== actor.orgId) {
      fail(403, "You do not have access to this session");
    }
    const cardResult = await client.query<CardRow>(
      `SELECT id, session_id,
              COALESCE(NULLIF(BTRIM(suggested_question), ''), title) AS question_text,
              answered, answered_by
       FROM live_cards
       WHERE id = $1 AND session_id = $2
       FOR UPDATE`,
      [cardId, sessionId],
    );
    const card = cardResult.rows[0];
    if (!card || card.answered) fail(404, "Card not found or already answered");
    await client.query(
      `UPDATE live_cards
       SET answered = TRUE, answered_by = 'manual', answered_at = $1, state = 'ANSWERED'
       WHERE id = $2 AND session_id = $3`,
      [timestamp(), cardId, sessionId],
    );
    return { cardId, questionText: card.question_text };
  });
}

export const meetingAnswerLimits = {
  maxAnswerChars: MAX_ANSWER_CHARS,
  maxQuestionChars: MAX_QUESTION_CHARS,
};
