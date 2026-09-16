import type { AIBlock, AnsweredSource, LiveCardDTO, SuggestionCard } from "@shared/types";
import { newId, now } from "../lib/ids";
import { isNearDuplicate } from "../lib/textSimilarity";
import { db } from "../db/database";

const bySession = new Map<string, Map<string, SuggestionCard>>();

const hydrated = new Set<string>();

interface LiveCardRow {
  id: string;
  session_id: string;
  title: string;
  brief_description: string;
  suggested_question: string | null;
  card_type: SuggestionCard["cardType"];
  urgency: SuggestionCard["urgency"];
  confidence: number | null;
  answered: boolean;
  answered_by: AnsweredSource | null;
  answer_text: string | null;
  created_at: string;
}

function rowToCard(row: LiveCardRow): SuggestionCard {
  const card: SuggestionCard = {
    id: row.id,
    sessionId: row.session_id,
    question: row.suggested_question?.trim() || row.title,
    reason: row.brief_description,
    answered: row.answered,
    createdAt: new Date(row.created_at).toISOString(),
  };
  if (row.answered_by) card.answeredBy = row.answered_by;
  if (row.answer_text) card.answerText = row.answer_text;
  if (row.card_type) card.cardType = row.card_type;
  if (row.urgency) card.urgency = row.urgency;
  if (typeof row.confidence === "number") card.confidence = row.confidence;
  return card;
}

// Write-through to `live_cards`. The stack used to live only in process memory,
// so a backend restart or deploy mid-meeting silently erased every open card —
// the facilitator's pending questions vanished with no message, which reads as
// "the AI gave up". hydrate() restores a session when this process has no memory
// of it. Never throws: a DB blip must not take down the live meeting.
export async function hydrate(sessionId: string): Promise<void> {
  if (hydrated.has(sessionId)) return;
  try {
    const result = await db.query<LiveCardRow>(
      `SELECT id, session_id, title, brief_description, suggested_question,
              card_type, urgency, confidence, answered, answered_by, answer_text, created_at
       FROM live_cards
       WHERE session_id = $1 AND state <> 'DISMISSED'
       ORDER BY created_at ASC`,
      [sessionId],
    );
    const m = sessionMap(sessionId);
    for (const row of result.rows) {
      if (!m.has(row.id)) m.set(row.id, rowToCard(row));
    }
    if (result.rows.length) {
      console.log(
        `[suggestions] restored ${result.rows.length} card(s) for session ${sessionId} from live_cards`,
      );
    }
    hydrated.add(sessionId);
  } catch (err) {
    console.error(`[suggestions] hydrate failed for ${sessionId}:`, err);
  }
}

async function persistCards(cards: SuggestionCard[]): Promise<void> {
  if (cards.length === 0) return;
  await db.tx(async (client) => {
    for (const card of cards) {
      await client.query(
      `INSERT INTO live_cards
         (id, session_id, card_type, title, brief_description, suggested_question,
          urgency, state, confidence, answered, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        card.id,
        card.sessionId,
        card.cardType ?? "QUESTION_SUGGESTION",
        card.question,
        card.reason,
        card.question,
        card.urgency ?? "MEDIUM",
        "NEW",
        card.confidence ?? null,
        false,
        card.createdAt,
      ],
      );
    }
  });
}

const MAX_OPEN_CARDS_PER_SESSION = 4;

const MIN_CARD_CONFIDENCE = 0.5;

function sessionMap(sessionId: string): Map<string, SuggestionCard> {
  let m = bySession.get(sessionId);
  if (!m) {
    m = new Map();
    bySession.set(sessionId, m);
  }
  return m;
}

export async function createFromBlocks(sessionId: string, blocks: AIBlock[]): Promise<SuggestionCard[]> {
  const m = sessionMap(sessionId);
  const created: SuggestionCard[] = [];
  for (const b of blocks) {
    if (b.type !== "QuestionSuggestion") continue;
    const card: SuggestionCard = {
      id: newId("sug"),
      sessionId,
      question: b.title,
      reason: b.content,
      answered: false,
      createdAt: now(),
    };
    created.push(card);
  }
  await persistCards(created);
  for (const card of created) m.set(card.id, card);
  return created;
}

export async function createFromLiveCards(sessionId: string, cards: LiveCardDTO[]): Promise<SuggestionCard[]> {
  const m = sessionMap(sessionId);
  const created: SuggestionCard[] = [];

  let openCount = openCards(sessionId).length;
  const seenQuestions = allCards(sessionId).map((c) => c.question);

  for (const c of cards) {
    if (c.confidence !== undefined && c.confidence < MIN_CARD_CONFIDENCE) continue;
    if (openCount >= MAX_OPEN_CARDS_PER_SESSION) continue;

    const question = c.suggested_question?.trim() || c.title;
    if (seenQuestions.some((seen) => isNearDuplicate(question, seen))) continue;

    const card: SuggestionCard = {
      id: newId("sug"),
      sessionId,
      question,
      reason: c.brief_description,
      answered: false,
      createdAt: now(),
      cardType: c.card_type,
      urgency: c.urgency,
      confidence: c.confidence,
    };
    created.push(card);
    seenQuestions.push(question);
    openCount++;
  }
  await persistCards(created);
  for (const card of created) m.set(card.id, card);
  return created;
}

export function openCards(sessionId: string): SuggestionCard[] {
  return [...sessionMap(sessionId).values()].filter((c) => !c.answered);
}

export function allCards(sessionId: string): SuggestionCard[] {
  return [...sessionMap(sessionId).values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

/**
 * `answerText` is the facilitator typing the answer instead of saying it.
 *
 * The stack could only be cleared by speaking into the room, so a facilitator
 * who wanted to answer the AI had to interrupt whoever was talking. The typed
 * answer is kept on the card so the record shows what the question was settled
 * with, not merely that somebody pressed a button.
 */
export async function markAnswered(
  sessionId: string,
  cardId: string,
  source: AnsweredSource,
  answerText?: string | null,
): Promise<SuggestionCard | null> {
  const card = sessionMap(sessionId).get(cardId);
  if (!card || (card.answered && !(source === "manual" && card.answeredBy === "auto"))) return null;
  const answer = answerText?.trim() || null;
  const at = now();
  const result = await db.query(
    `UPDATE live_cards
     SET answered = TRUE, answered_by = $1, answered_at = $2, state = 'ANSWERED',
         answer_text = COALESCE($4, answer_text)
     WHERE id = $3 AND session_id = $5
       AND (answered = FALSE OR ($1 = 'manual' AND answered_by = 'auto'))`,
    [source, at, cardId, answer, sessionId],
  );
  if (result.rowCount === 0) return null;
  card.answered = true;
  card.answeredBy = source;
  if (answer) card.answerText = answer;
  return card;
}

/** Applies a committed answer after its transaction has succeeded. */
export function applyCommittedAnswer(
  sessionId: string,
  cardId: string,
  answerText: string,
): SuggestionCard | null {
  const card = sessionMap(sessionId).get(cardId);
  if (!card) return null;
  card.answered = true;
  card.answeredBy = "manual";
  card.answerText = answerText;
  return card;
}

// A card the AI got wrong is not a card the room answered. Without this the
// only way to clear one was "mark answered", which writes a falsehood into the
// record the summary later reads from. Dismissed cards leave the stack for good
// — hydrate() already filters state = 'DISMISSED' out on restore.
function persistDismissed(cardId: string, at: string): void {
  void db
    .query(
      `UPDATE live_cards
       SET answered = TRUE, answered_at = $1, state = 'DISMISSED'
       WHERE id = $2`,
      [at, cardId],
    )
    .catch((err) => console.error(`[suggestions] persist dismissed failed for ${cardId}:`, err));
}

export function dismissCard(sessionId: string, cardId: string): SuggestionCard | null {
  const m = sessionMap(sessionId);
  const card = m.get(cardId);
  if (!card) return null;

  m.delete(cardId);
  persistDismissed(cardId, now());
  return card;
}

export function clearSession(sessionId: string): void {
  bySession.delete(sessionId);
  hydrated.delete(sessionId);
}
