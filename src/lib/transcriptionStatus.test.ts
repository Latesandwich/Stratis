import assert from "node:assert/strict";
import test from "node:test";
import { transcriptionStatus } from "./transcriptionStatus.ts";
import * as status from "./transcriptionStatus.ts";

test("does not reactivate transcription when a stale capture starts after Stop", () => {
  assert.equal(typeof status.isLiveTranscriptionActive, "function");
  assert.equal(status.isLiveTranscriptionActive(false, true), false);
  assert.equal(transcriptionStatus(status.isLiveTranscriptionActive(false, true)), null);
});

test("requires live capture as well as recording intent before announcing transcription", () => {
  assert.equal(typeof status.isLiveTranscriptionActive, "function");
  assert.equal(status.isLiveTranscriptionActive(true, false), false);
  assert.equal(status.isLiveTranscriptionActive(false, false), false);
  assert.equal(status.isLiveTranscriptionActive(true, true), true);
  assert.equal(transcriptionStatus(status.isLiveTranscriptionActive(true, true)), "Transcription on");
});

test("does not announce transcription before or after live capture", () => {
  assert.equal(transcriptionStatus(false), null);
});

test("announces transcription only during live capture", () => {
  assert.equal(transcriptionStatus(true), "Transcription on");
});
