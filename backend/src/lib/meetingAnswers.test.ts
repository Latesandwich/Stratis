import { test } from "node:test";
import assert from "node:assert/strict";

type QueryResult<T> = { rows: T[]; rowCount?: number | null };
type Query = <T>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;

type SaveMeetingAnswer = (input: {
  sessionId: string;
  questionId: string;
  origin: "planned" | "ai";
  plannedQuestionText?: string;
  text: string;
  requestId: string;
}, actor: { id: string; orgId: string; role: "facilitator" }, options: {
  db: { tx<T>(fn: (client: { query: Query }) => Promise<T>): Promise<T> };
  newId: (prefix: string) => string;
  now: () => string;
}) => Promise<{
  id: string;
  sessionId: string;
  questionId: string;
  questionText: string;
  text: string;
  actorId: string | null;
  speaker: string;
  createdAt: string;
  transcriptId: string;
  created: boolean;
}>;

const meetingAnswers = await import("./meetingAnswers.ts").catch(() => null) as
  | { saveMeetingAnswer?: SaveMeetingAnswer; MeetingAnswerError?: new (...args: any[]) => Error }
  | null;

function fakeStore(respond: (sql: string, params: unknown[]) => QueryResult<any>): {
  db: { tx<T>(fn: (client: { query: Query }) => Promise<T>): Promise<T> };
  queries: Array<{ sql: string; params: unknown[] }>;
} {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const query: Query = async <T>(sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    return respond(sql, params) as QueryResult<T>;
  };
  return { db: { tx: (fn) => fn({ query }) }, queries };
}

const actor = { id: "user_1", orgId: "org_1", role: "facilitator" as const };
const input = {
  sessionId: "session_1",
  questionId: "card_1",
  origin: "ai" as const,
  text: "Ship it Friday.",
  speaker: "Mina",
  requestId: "request_1",
};

test("saves an AI answer and its typed transcript in one transaction", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) return { rows: [] };
    if (sql.includes("FROM live_cards")) {
      return { rows: [{ id: "card_1", session_id: "session_1", question_text: "When do we ship?", answered: false, answered_by: null }] };
    }
    return { rows: [] };
  });

  const saved = await meetingAnswers!.saveMeetingAnswer!(input, actor, {
    db: store.db,
    newId: (prefix) => `${prefix}_new`,
    now: () => "2026-09-16T00:00:00.000Z",
  });

  assert.deepEqual(saved, {
    id: "answer_new",
    sessionId: "session_1",
    questionId: "card_1",
    questionText: "When do we ship?",
    text: "Ship it Friday.",
    actorId: "user_1",
    speaker: "Mina",
    createdAt: "2026-09-16T00:00:00.000Z",
    transcriptId: "tx_new",
    created: true,
  });
  assert.equal(store.queries.filter(({ sql }) => sql.includes("INSERT INTO transcripts")).length, 1);
  assert.equal(store.queries.filter(({ sql }) => sql.includes("INSERT INTO meeting_answers")).length, 1);
  assert.equal(store.queries.filter(({ sql }) => sql.includes("answer_context_jobs")).length, 0);
  assert.equal(store.queries.filter(({ sql }) => sql.includes("UPDATE live_cards")).length, 1);
});

test("marks an identical timed-out retry as existing without another transcript", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) {
      return { rows: [{
        id: "answer_existing", session_id: "session_1", question_id: "card_1",
        origin: "ai", question_text: "When do we ship?", text: "Ship it Friday.",
        actor_id: "user_1", created_at: "2026-09-16T00:00:00.000Z", transcript_id: "tx_existing", speaker: "Mina",
      }] };
    }
    return { rows: [] };
  });

  const saved = await meetingAnswers!.saveMeetingAnswer!(input, actor, {
    db: store.db,
    newId: () => "unexpected",
    now: () => "unexpected",
  });

  assert.equal(saved.id, "answer_existing");
  assert.equal(saved.transcriptId, "tx_existing");
  assert.equal(saved.speaker, "Mina");
  assert.equal(saved.created, false);
  assert.equal(store.queries.filter(({ sql }) => sql.includes("INSERT INTO")).length, 0);
});

test("rejects reuse of a request id with different answer text", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) {
      return { rows: [{
        id: "answer_existing", session_id: "session_1", question_id: "card_1",
        origin: "ai", question_text: "When do we ship?", text: "Different answer.",
        actor_id: "user_1", created_at: "2026-09-16T00:00:00.000Z", transcript_id: "tx_existing", speaker: "Mina",
      }] };
    }
    return { rows: [] };
  });

  await assert.rejects(
    meetingAnswers!.saveMeetingAnswer!(input, actor, {
      db: store.db,
      newId: () => "unexpected",
      now: () => "unexpected",
    }),
    (error: any) => error?.status === 409,
  );
});

test("rejects a planned question when its local stable id is missing", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore(() => ({ rows: [] }));

  await assert.rejects(
    meetingAnswers!.saveMeetingAnswer!({ ...input, origin: "planned", questionId: "", plannedQuestionText: "Who owns this?" }, actor, {
      db: store.db,
      newId: () => "unexpected",
      now: () => "unexpected",
    }),
    (error: any) => error?.status === 400,
  );
  assert.equal(store.queries.length, 0);
});

test("rolls back the answer and card update when typed transcript insertion fails", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const committed: Array<{ sql: string; params: unknown[] }> = [];
  const store = {
    db: {
      async tx<T>(fn: (client: { query: Query }) => Promise<T>): Promise<T> {
        const pending: Array<{ sql: string; params: unknown[] }> = [];
        const query: Query = async <R>(sql: string, params: unknown[] = []) => {
          pending.push({ sql, params });
          if (sql.includes("FROM sessions s")) {
            return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] } as QueryResult<R>;
          }
          if (sql.includes("FROM meeting_answers")) return { rows: [] } as QueryResult<R>;
          if (sql.includes("FROM live_cards")) {
            return { rows: [{ id: "card_1", session_id: "session_1", question_text: "When do we ship?", answered: false, answered_by: null }] } as QueryResult<R>;
          }
          if (sql.includes("INSERT INTO transcripts")) throw new Error("injected transcript failure");
          return { rows: [] } as QueryResult<R>;
        };
        const value = await fn({ query });
        committed.push(...pending);
        return value;
      },
    },
  };

  await assert.rejects(
    meetingAnswers!.saveMeetingAnswer!(input, actor, {
      db: store.db,
      newId: (prefix) => `${prefix}_new`,
      now: () => "2026-09-16T00:00:00.000Z",
    }),
    /injected transcript failure/,
  );
  assert.equal(committed.filter(({ sql }) => sql.includes("INSERT INTO meeting_answers")).length, 0);
  assert.equal(committed.filter(({ sql }) => sql.includes("UPDATE live_cards")).length, 0);
});

test("uses server card text and accepts a manual answer after automatic detection", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) return { rows: [] };
    if (sql.includes("FROM live_cards")) {
      return { rows: [{ id: "card_1", session_id: "session_1", question_text: "When do we ship?", answered: true, answered_by: "auto" }] };
    }
    return { rows: [] };
  });

  const saved = await meetingAnswers!.saveMeetingAnswer!(input, actor, {
    db: store.db,
    newId: (prefix) => `${prefix}_new`,
    now: () => "2026-09-16T00:00:00.000Z",
  });

  assert.equal(saved.questionText, "When do we ship?");
  assert.equal(store.queries.filter(({ sql }) => sql.includes("UPDATE live_cards")).length, 1);
});

test("saves a planned question without an AI card", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) return { rows: [] };
    return { rows: [] };
  });

  const saved = await meetingAnswers!.saveMeetingAnswer!({
    ...input,
    questionId: "planned_q_1",
    origin: "planned",
    plannedQuestionText: "Who owns the rollout?",
  }, actor, {
    db: store.db,
    newId: (prefix) => `${prefix}_new`,
    now: () => "2026-09-16T00:00:00.000Z",
  });

  assert.equal(saved.questionText, "Who owns the rollout?");
  assert.equal(store.queries.some(({ sql }) => sql.includes("FROM live_cards")), false);
});

test("rejects an answer for a card outside the requested session", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    if (sql.includes("FROM meeting_answers")) return { rows: [] };
    if (sql.includes("FROM live_cards")) return { rows: [] };
    return { rows: [] };
  });

  await assert.rejects(
    meetingAnswers!.saveMeetingAnswer!(input, actor, {
      db: store.db,
      newId: () => "unexpected",
      now: () => "unexpected",
    }),
    (error: any) => error?.status === 404,
  );
});

test("rejects a non-facilitator actor inside the transaction", async () => {
  assert.ok(meetingAnswers?.saveMeetingAnswer, "meeting answer service must be exported");
  const store = fakeStore((sql) => {
    if (sql.includes("FROM sessions s")) {
      return { rows: [{ id: "session_1", facilitator_id: "user_1", org_id: "org_1" }] };
    }
    return { rows: [] };
  });

  await assert.rejects(
    meetingAnswers!.saveMeetingAnswer!(input, { ...actor, role: "participant" } as any, {
      db: store.db,
      newId: () => "unexpected",
      now: () => "unexpected",
    }),
    (error: any) => error?.status === 403,
  );
});
