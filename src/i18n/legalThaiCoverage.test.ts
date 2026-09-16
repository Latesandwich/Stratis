import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL_DOCUMENTS } from "../lib/legalDocuments.ts";
import { TH } from "./th.ts";

test("beta legal pages and their entry points have Thai copy", () => {
  const fixedCopy = [
    "Beta document",
    "Download Stratis",
    "Checking the latest verified release…",
    "Download details are temporarily unavailable.",
    "Download for Windows",
    "Release notes",
    "Transcription on",
    "Stratis is creating a live transcript of this meeting.",
    "Privacy Notice",
    "Terms of Use",
    "You can pause or stop transcription from the meeting screen.",
  ];

  for (const copy of fixedCopy) {
    assert.ok(TH[copy], `Missing Thai translation: ${copy}`);
  }

  for (const document of Object.values(LEGAL_DOCUMENTS)) {
    assert.ok(TH[document.title], `Missing Thai document title: ${document.title}`);
    for (const section of document.sections) {
      assert.ok(TH[section.heading], `Missing Thai section heading: ${section.heading}`);
      for (const paragraph of section.paragraphs) {
        assert.ok(TH[paragraph], `Missing Thai paragraph: ${paragraph}`);
      }
    }
  }
});
