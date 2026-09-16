import assert from "node:assert/strict";
import test from "node:test";
import { publicRouteForPath } from "./publicRoutes.ts";

test("recognises shareable legal paths as public routes", () => {
  assert.equal(publicRouteForPath("/privacy"), "privacy");
  assert.equal(publicRouteForPath("/terms"), "terms");
});

test("does not turn unrelated paths into public routes", () => {
  assert.equal(publicRouteForPath("/projects"), null);
});
