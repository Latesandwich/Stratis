# Beta consent and legal surfaces design

**Status:** approved for implementation planning  
**Date:** 2026-09-16  
**Scope:** Stratis Windows installer, live website recording flow, and public beta legal pages

## Goal

Give people clear, timely information about Stratis’s AI-assisted meeting processing without adding a consent or confirmation barrier to starting a meeting. The experience must work during the beta even though Stratis does not yet have an incorporated company entity or final retention configuration.

This is a product and implementation design, not legal advice. A qualified reviewer must complete the launch identity, contact, jurisdiction, retention, and processor-contract fields before public release.

## Decision

Use three complementary surfaces. No single acceptance event is treated as sufficient for all people or all recording circumstances.

| Surface | Audience and timing | Purpose |
| --- | --- | --- |
| Windows installer | Person installing Stratis | Shows the bundled beta Terms of Use and Privacy Notice; requires agreement before installation continues. |
| Live transcription status | Anyone who can see Stratis while a real recording is active | States plainly that Stratis is creating a live transcript. |
| Public legal pages | Hosts, participants, prospective users | Provides a stable, linkable explanation from the download page, app, and installer. |

The installer acceptance applies only to the installer. It does not substitute for notice to people in a meeting. Stratis cannot identify or directly notify people who are only present in Zoom, Meet, or another platform.

## Legal documents and language boundaries

Create two plain-language beta documents:

- **Privacy Notice:** Stratis collects account/workspace information, meeting metadata, audio when recording is enabled, transcripts, transcript-derived evidence/questions, user-supplied answers, and necessary diagnostics. Audio and selected transcript material are processed through Google services to provide transcription and meeting-support features. The document describes the purpose, categories, security practices, participant notice, deletion/export request path, and external processing limitations.
- **Terms of Use:** The host is responsible for informing participants and obtaining any required permission before recording. Stratis is a meeting-support tool; transcripts and AI output can be incomplete or wrong and must be reviewed before decisions or reliance. The terms prohibit unlawful recording, rights violations, misuse, security interference, and high-impact use without appropriate human review.

The documents must not claim that data stays in a particular country, that AI vendors never retain data, that outputs are accurate, or that Stratis deletes data immediately. They state that Google services and configured features may retain data as described by the policy. Production must keep Google transcription-service data logging disabled and use a billing-enabled Google AI service before accepting real meeting content.

Before public launch, the operator must replace the marked beta contact block with the actual legal/operator name, email or support route, effective date, jurisdictional rights language, and Stratis retention/deletion periods. The pages display a conspicuous “Beta policy—launch contact and retention details are being finalised” banner until these values are complete; they must not be presented as final public terms while that banner exists.

## Installer behavior

The Inno Setup package includes the current Terms and Privacy Notice as local text assets. A custom wizard page follows the existing welcome/maintenance choice and precedes installation. It contains:

- a concise summary: “Stratis can process meeting audio and transcript material through Google services when a host records a meeting”;
- buttons to read each bundled document in the installer;
- a required checkbox: “I have read and agree to the Beta Terms of Use and Privacy Notice”; and
- a disabled Next button until checked.

The page applies to a fresh install and update path, but does not offer a legal bypass in silent mode. A silent installation is permitted only when an explicit installer flag declares prior acceptance of the current document version; otherwise it exits with a clear message. The installer records the accepted document version and UTC timestamp in `%LocalAppData%\\Stratis`, separately from the program folder, so a normal update preserves that record.

The installer never uploads acceptance data, records participant consent, or claims to have authority for a meeting.

## Live transcription status

The website beta currently owns actual recording. When `Meeting.tsx` starts microphone/PCM capture and sends an STT start control, immediately show a persistent, clear status near the transcript:

> **Transcription on**  
> Stratis is creating a live transcript of this meeting.

There is no host attestation, participant checkbox, or start-of-recording modal. The host starts and stops transcription using the existing controls. The status remains visible for the entire capture period and changes immediately when capture stops. The transcript view includes unobtrusive links to the public Terms and Privacy Notice.

No participant acknowledgement is collected or stored. Stratis must not claim that a person who joined an external meeting platform saw a Stratis notice, agreed to recording, or can be identified as a participant. The host can see the transcription status while capture is active.

Desktop currently provides sample playback only and must not claim that it records audio. Its Settings/About area will expose the same legal documents and current document version; the live-transcription status is added to desktop only when real capture is implemented.

## Public pages and linking

Add `/privacy` and `/terms` routes to the website. The download page, live-transcription status, installer copy, and desktop Settings all point to them. Page content is versioned in source with a human-readable effective date. A release changes the legal-document version only when the content changes; installer acceptance references that version.

If pages cannot be loaded, the concise live-transcription status still works. Installer documents remain available locally. A public release remains blocked until the legal routes are available.

## Failure handling and privacy boundaries

- The recording UI must accurately reflect capture state; it never displays “Transcription on” before capture starts or after it has stopped.
- Error diagnostics contain status codes and correlation identifiers, not raw audio, full transcript text, or AI prompts.
- Deleting a meeting must cover Stratis’s audio/transcript/evidence records and follow documented downstream deletion schedules; vendor-side retention exceptions are disclosed, not hidden.
- The UI avoids misleading participants: no claim that external attendees have agreed, been notified, or can be identified; no forced agreement to unrelated marketing.

## Testing and acceptance criteria

- Installer tests verify a fresh install/update requires explicit agreement, local documents open, silent installation rejects without an explicit current-version acceptance flag, and the acceptance record is preserved on normal update.
- Website tests verify transcription status appears only after the recording-start path succeeds, remains visible during live capture, stops immediately when capture ends, and links to both legal pages.
- Route tests verify `/privacy` and `/terms` render their correct version and all legal links resolve.
- Copy tests ensure Terms, Privacy, recording disclosure, and installer summary name the same processors and do not promise unsupported deletion, residency, or accuracy.
- Manual review verifies keyboard operation, readable Thai/English copy, the status is visually persistent but not disruptive, and the copy does not imply external-platform attendees were individually notified.

## Non-goals

- Legal advice, jurisdiction-specific compliance certification, or an assertion that a particular consent model is sufficient everywhere.
- A participant-identification, signature, or attendance-consent system.
- Analytics, marketing consent, advertising cookies, payment terms, or user monitoring.
- Storing raw audio or full transcripts solely to prove consent.
- Adding real desktop capture in this work.
