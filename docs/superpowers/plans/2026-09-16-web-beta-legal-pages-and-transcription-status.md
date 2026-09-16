# Web beta legal pages and transcription status implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the web beta stable, plain-language Privacy and Terms pages and make active transcription visible without blocking hosts or claiming notice from people outside Stratis.

**Architecture:** A small, framework-free legal-document module owns the versioned public copy so pages and links cannot drift. `App.tsx` maps both conventional (`/privacy`, `/terms`) and hash routes to one reusable public document page. Meeting status derives only from live capture state, while the existing start flow remains free of new consent prompts or attestations.

**Tech Stack:** React 18, TypeScript, Vite, Node's built-in test runner with TypeScript stripping.

**Spec:** `docs/superpowers/specs/2026-09-16-beta-consent-and-legal-surfaces-design.md`

## Global Constraints

- Public product copy uses **Stratis**; do not rename repository, package, installer, or internal identifiers in this work.
- Public copy may identify **Google services**, but must not name a particular transcription or AI model.
- Do not add a participant checkbox, a host attestation, a recording-start consent modal, or a consent-persistence API.
- Do not claim that an attendee in Zoom, Meet, or another external platform was notified, agreed, or can be identified by Stratis.
- The Terms place responsibility for required notice and permission on the person who starts transcription; the Privacy Notice states the product limitation plainly.
- Keep the pre-incorporation beta warning and do not invent a company identity, privacy email address, retention period, data-residency promise, instant-deletion promise, or accuracy guarantee.
- The working tree contains unrelated user work. Stage, commit, publish, push, tag, and deploy nothing in this plan.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/legalDocuments.ts` | Single source of truth for the beta document version, effective date, headings, and public copy. |
| `src/lib/legalDocuments.test.ts` | Locks the public legal boundary: both documents exist, use the allowed processor description, and retain the beta/host/external-platform disclosures. |
| `src/lib/publicRoutes.ts` | Maps conventional public paths to their entry-page identifiers without coupling route tests to React. |
| `src/lib/publicRoutes.test.ts` | Proves `/privacy` and `/terms` resolve as public entry routes and unknown paths are not treated as public pages. |
| `src/pages/LegalDocument.tsx` | Reusable, readable public document page with a beta banner and download/home links. |
| `src/App.tsx` | Lazy-loads legal pages and recognizes `/privacy`, `/terms`, `#/privacy`, and `#/terms` before the auth shell. |
| `src/pages/Download.tsx` | Adds visible legal links to the public download page. |
| `src/lib/transcriptionStatus.ts` | Maps actual capture state to the one user-facing label needed by `Meeting`. |
| `src/lib/transcriptionStatus.test.ts` | Proves the label is absent before/after capture and appears only for live capture. |
| `src/pages/Meeting.tsx` | Replaces ambiguous capture wording with the persistent transcription status, using actual capture state rather than the record-button intent. |
| `src/components/StartMeetingConfirm.tsx` | Removes the in-product legal reminder from the existing meeting-details confirmation; it remains a meeting-details confirmation only. |

## Task 1: Versioned beta legal content

**Files:**
- Create: `src/lib/legalDocuments.ts`
- Create: `src/lib/legalDocuments.test.ts`

**Interfaces:**
- Produces: `type LegalDocumentId = "privacy" | "terms"`.
- Produces: `interface LegalDocument { id: LegalDocumentId; title: string; version: "2026-09-16-beta-1"; effectiveDate: "16 September 2026"; sections: readonly { heading: string; paragraphs: readonly string[] }[] }`.
- Produces: `getLegalDocument(id: LegalDocumentId): LegalDocument` and `LEGAL_DOCUMENTS: Readonly<Record<LegalDocumentId, LegalDocument>>`.

- [ ] **Step 1: Write the failing legal-content test**

```ts
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
```

- [ ] **Step 2: Run the test and verify it fails because the module does not exist**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/legalDocuments.test.ts; Pop-Location`

Expected: FAIL with a module-not-found error for `legalDocuments.ts`.

- [ ] **Step 3: Implement the minimal content module**

```ts
export const BETA_LEGAL_VERSION = "2026-09-16-beta-1" as const;
export type LegalDocumentId = "privacy" | "terms";

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return LEGAL_DOCUMENTS[id];
}
```

Give both documents a first section headed **Beta notice** that says Stratis is pre-incorporation, identity/contact/retention details are still being finalised, and the document is not final production legal copy. Include: data categories and Google-services processing in Privacy; host notice/permission responsibility, external-platform limitation, and human review/no-accuracy guarantee in Terms. Do not name models or providers beyond “Google services.”

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/legalDocuments.test.ts; Pop-Location`

Expected: PASS, 2 tests.

- [ ] **Step 5: Run the project type/build check**

Run: `npm run build`

Expected: Vite production build succeeds.

## Task 2: Public legal routes and download links

**Files:**
- Create: `src/lib/publicRoutes.ts`
- Create: `src/lib/publicRoutes.test.ts`
- Create: `src/pages/LegalDocument.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/Download.tsx`

**Interfaces:**
- Consumes: `LegalDocumentId` and `getLegalDocument()` from `src/lib/legalDocuments.ts`.
- Produces: `publicRouteForPath(pathname: string): "download" | "privacy" | "terms" | null`.
- Produces: public `/privacy`, `/terms`, `#/privacy`, and `#/terms` entry routes that render the correct document before authentication.

- [ ] **Step 1: Write a failing route-content assertion**

```ts
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
```

- [ ] **Step 2: Run the focused test and verify the new assertion fails**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/publicRoutes.test.ts; Pop-Location`

Expected: FAIL with a module-not-found error for `publicRoutes.ts`.

- [ ] **Step 3: Add the page and route handling**

```tsx
export default function LegalDocumentPage({ documentId }: { documentId: LegalDocumentId }) {
  const document = getLegalDocument(documentId);
  // Render title, version/effective date, the beta warning, and every section.
}
```

Add `publicRouteForPath()` with an explicit `switch` over `/download`, `/privacy`, and `/terms`. In `App.tsx`, add lazy imports for `LegalDocumentPage`; use `publicRouteForPath(window.location.pathname)` in `readEntryRoute()` when no hash is present; and render legal pages in the existing public-route block before the auth gate. The existing hash parsing continues to support `#/privacy` and `#/terms`. Use `href="/privacy"` and `href="/terms"` for stable, shareable links. In `Download.tsx`, place a compact `Privacy Notice` / `Terms of Use` link row below the installer guidance, visible whether release metadata is loading, available, or unavailable.

- [ ] **Step 4: Run focused test and production build**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/legalDocuments.test.ts ../src/lib/publicRoutes.test.ts; Pop-Location; npm run build`

Expected: 4 focused tests PASS and Vite build succeeds.

- [ ] **Step 5: Perform a manual route smoke check**

Run: `npm run dev -- --host 127.0.0.1`

Expected: `/privacy`, `/terms`, `#/privacy`, and `#/terms` render without authentication; `/download` shows working links to both pages. Stop the local server after inspection.

## Task 3: Accurate, non-blocking live-transcription status

**Files:**
- Create: `src/lib/transcriptionStatus.ts`
- Create: `src/lib/transcriptionStatus.test.ts`
- Modify: `src/pages/Meeting.tsx`
- Modify: `src/components/StartMeetingConfirm.tsx`

**Interfaces:**
- Produces: `transcriptionStatus(isCaptureLive: boolean): "Transcription on" | null`.
- Consumes: `captureLive` in `Meeting.tsx`, which is true only while the PCM stream is healthy or the clip recorder reports `recording`.
- Produces: a persistent `role="status"` element with label **Transcription on**, detail “Stratis is creating a live transcript of this meeting.”, and legal links only while capture is live.

- [ ] **Step 1: Write the failing pure-status tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { transcriptionStatus } from "./transcriptionStatus.ts";

test("does not announce transcription before or after live capture", () => {
  assert.equal(transcriptionStatus(false), null);
});

test("announces transcription only during live capture", () => {
  assert.equal(transcriptionStatus(true), "Transcription on");
});
```

- [ ] **Step 2: Run the test and verify it fails because the helper does not exist**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/transcriptionStatus.test.ts; Pop-Location`

Expected: FAIL with a module-not-found error for `transcriptionStatus.ts`.

- [ ] **Step 3: Implement the helper and wire it to actual capture state**

```ts
export function transcriptionStatus(isCaptureLive: boolean): "Transcription on" | null {
  return isCaptureLive ? "Transcription on" : null;
}
```

In `Meeting.tsx`, read `status` from `useMediaRecorder` as `recorderStatus` and calculate `captureLive` as `(pcm.status === "streaming" && pcm.health === "live") || recorderStatus === "recording"`. This prevents a transcription claim while microphone permission is still pending or has failed. Render the new persistent status next to the existing meeting status only when `transcriptionStatus(captureLive)` returns a label. Link **Privacy Notice** and **Terms of Use** from that status. Do not add a modal, checkbox, confirmation, or new backend call.

Replace the legal-reminder paragraph in `StartMeetingConfirm.tsx` with: “You can pause or stop transcription from the meeting screen.” The component’s existing meeting-details confirmation remains otherwise unchanged.

- [ ] **Step 4: Run focused tests and production build**

Run: `Push-Location backend; node --experimental-strip-types --test ../src/lib/transcriptionStatus.test.ts ../src/lib/legalDocuments.test.ts; Pop-Location; npm run build`

Expected: 4 focused tests PASS and Vite build succeeds.

- [ ] **Step 5: Manually verify start, live, and stopped states**

Run: `npm run dev -- --host 127.0.0.1`

Expected: no transcription status while microphone permission is pending; status appears only after live capture begins; it disappears immediately after Pause/End; no consent UI is added. Stop the local server after inspection.

## Task 4: Final copy and regression verification

**Files:**
- Verify: `src/lib/legalDocuments.ts`
- Verify: `src/lib/publicRoutes.ts`
- Verify: `src/pages/LegalDocument.tsx`
- Verify: `src/App.tsx`
- Verify: `src/pages/Download.tsx`
- Verify: `src/pages/Meeting.tsx`
- Verify: `src/components/StartMeetingConfirm.tsx`

**Interfaces:**
- Verifies: all public legal copy uses the central document module and live status makes no assertion about external attendees.

- [ ] **Step 1: Scan public copy for prohibited detail and unsupported claims**

Run: `rg -n -i "chirp|gemini|model|all participants|everyone agreed|everyone was notified|guarantee|immediate deletion|data residency" src/lib/legalDocuments.ts src/pages/LegalDocument.tsx src/pages/Meeting.tsx src/components/StartMeetingConfirm.tsx`

Expected: no model names, no claim that all external attendees agreed/were notified, and no unsupported privacy promises.

- [ ] **Step 2: Run all relevant checks**

Run: `Push-Location backend; npm test; Pop-Location; npm run build; git diff --check`

Expected: backend test suite passes, Vite build succeeds, and `git diff --check` returns no whitespace errors.

- [ ] **Step 3: Review only this plan’s changed files**

Run: `git diff -- src/lib/legalDocuments.ts src/lib/legalDocuments.test.ts src/lib/publicRoutes.ts src/lib/publicRoutes.test.ts src/pages/LegalDocument.tsx src/App.tsx src/pages/Download.tsx src/lib/transcriptionStatus.ts src/lib/transcriptionStatus.test.ts src/pages/Meeting.tsx src/components/StartMeetingConfirm.tsx`

Expected: no unrelated files, no generated artifacts, no account/model secret, no change to recording authorization behavior beyond removing the existing on-screen legal reminder.

- [ ] **Step 4: Record handoff without committing**

Record the changed-file list and test output in the final handoff. Do not run `git add`, `git commit`, `git push`, a release command, or deployment command in this dirty shared checkout.
