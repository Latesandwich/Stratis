import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(resolve(directory, "schema.sql"), "utf8");

test("meeting answers do not block meeting or account deletion", () => {
  assert.match(
    schema,
    /actor_id TEXT REFERENCES users\(id\) ON DELETE SET NULL/,
  );
  assert.match(
    schema,
    /FOREIGN KEY \(session_id, live_card_id\)\s+REFERENCES live_cards\(session_id, id\) ON DELETE CASCADE/,
  );
  assert.match(schema, /DROP CONSTRAINT IF EXISTS meeting_answers_session_id_live_card_id_fkey/);
  assert.match(schema, /DROP CONSTRAINT IF EXISTS meeting_answers_actor_id_fkey/);
});

test("obsolete answer-context jobs are removed during schema application", () => {
  assert.match(schema, /DROP TABLE IF EXISTS answer_context_jobs/);
  assert.doesNotMatch(schema, /CREATE TABLE IF NOT EXISTS answer_context_jobs/);
});
