import assert from "node:assert/strict";
import test from "node:test";
import { getLegalDocument, LEGAL_DOCUMENTS } from "./legalDocuments.ts";

test("publishes both versioned beta legal documents", () => {
  assert.equal(LEGAL_DOCUMENTS.privacy.version, "2026-09-16-beta-1");
  assert.equal(getLegalDocument("terms").title, "Beta Terms of Use");
});

test("legal copy discloses Google processing and the external-attendee limit", () => {
  const copy = Object.values(LEGAL_DOCUMENTS)
    .flatMap((document) => document.sections.flatMap((section) => section.paragraphs))
    .join(" ");

  assert.match(copy, /Google services/);
  assert.match(copy, /cannot identify or directly notify people who are only present in Zoom, Meet, or another external platform/);
  assert.match(copy, /person who starts transcription is responsible/);
});
