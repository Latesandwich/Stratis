import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const routesDir = dirname(fileURLToPath(import.meta.url));
const aiRoute = readFileSync(resolve(routesDir, "ai.ts"), "utf8");
const routeIndex = readFileSync(resolve(routesDir, "index.ts"), "utf8");
const suggestions = readFileSync(resolve(routesDir, "..", "realtime", "suggestions.ts"), "utf8");
const suggestionSocket = readFileSync(resolve(routesDir, "..", "..", "..", "src", "hooks", "useSuggestionSocket.ts"), "utf8");

test("desktop answer contract is mounted at the authenticated session URL", () => {
  assert.match(routeIndex, /apiRouter\.post\("\/session\/:id\/answers", requireAuth, requireSessionAccess\("params"\), saveMeetingAnswerHandler\)/);
  assert.match(aiRoute, /req\.params\.id/);
  assert.match(aiRoute, /saveMeetingAnswer\(/);
});

test("legacy suggested-answer endpoint delegates typed saves to the durable service", () => {
  const start = aiRoute.indexOf('aiRouter.post("/suggest/answer"');
  const handler = aiRoute.slice(start, aiRoute.indexOf("aiRouter.post", start + 1));
  assert.ok(start >= 0, "legacy suggested-answer endpoint must remain available");
  assert.match(handler, /saveMeetingAnswer\(/);
  assert.doesNotMatch(handler, /recordTypedTurn\(/);
  assert.doesNotMatch(handler, /suggestions\.markAnswered\(/);
});

test("only a newly saved answer is published and routed to AI", () => {
  const handlerStart = aiRoute.indexOf("export const saveMeetingAnswerHandler");
  const handlerEnd = aiRoute.indexOf("/** Existing web endpoint", handlerStart);
  const handler = aiRoute.slice(handlerStart, handlerEnd);
  assert.ok(handlerStart >= 0, "desktop answer handler must remain available");
  assert.match(handler, /saved\.created/);
  assert.doesNotMatch(handler, /pendingContextWork/);

  const legacyStart = aiRoute.indexOf('aiRouter.post("/suggest/answer"');
  const legacy = aiRoute.slice(legacyStart, aiRoute.indexOf("aiRouter.post", legacyStart + 1));
  assert.match(legacy, /saved\.created/);
  assert.doesNotMatch(legacy, /pendingContextWork/);
  assert.match(suggestionSocket, /typedAnswerRequestIdsRef/);
  assert.match(suggestionSocket, /requestId,/);
});

test("new cards are committed before the cache makes them visible", () => {
  const start = suggestions.indexOf("export async function createFromBlocks");
  const handler = suggestions.slice(start, suggestions.indexOf("export async function createFromLiveCards", start));
  assert.ok(start >= 0, "card creation must await durable storage");
  assert.match(handler, /await persistCards\(created\)/);
  assert.ok(
    handler.indexOf("await persistCards(created)") < handler.indexOf("m.set(card.id, card)"),
    "the cache must not make a card visible before its insert succeeds",
  );
  assert.match(suggestions, /await db\.tx\(async \(client\)/);
  assert.match(
    suggestions,
    /source === "manual" && card\.answeredBy === "auto"/,
  );
});
