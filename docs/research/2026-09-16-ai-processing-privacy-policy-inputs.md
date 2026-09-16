# Stratis AI processing: launch privacy-policy inputs

Research snapshot: 2026-09-16. This is product and vendor-documentation research, not legal advice or a conclusion about the law in any jurisdiction. Have counsel/privacy owners adapt the checklist to Stratis's actual data flows, customer contracts, user locations, and retention configuration before launch.

## Scope assumed for this note

Stratis captures meeting audio, sends it to Google Cloud Speech-to-Text V2 using `chirp_2`, receives a transcript, then sends transcript-derived evidence/questions to the Gemini API. This note does **not** assume that raw audio is sent to Gemini; doing so should be a separately disclosed design choice.

## Vendor-processing findings

### Speech-to-Text V2 / Chirp 2

- Chirp 2 is a Google Cloud Speech-to-Text **V2-only** model. It supports streaming, short recognition, and batch recognition. Google currently lists Chirp 2 in `us-central1`, `europe-west4`, and `asia-southeast1`; location, method, and language availability must be checked against the deployed configuration. [Chirp 2 documentation](https://cloud.google.com/speech-to-text/docs/models/chirp-2)
- Audio is transmitted to Google to perform transcription, and the returned transcript is also customer content. Google's Speech-to-Text data-usage FAQ says that, absent enrollment in its data-logging program, Google does not use submitted audio or returned transcripts except to provide the service; it says it does not make submitted audio available to others except as needed to provide the service. [Data usage FAQ](https://cloud.google.com/speech-to-text/docs/v1/data-usage-faq)
- Google documents data logging as off by default and describes opt-in logging as allowing audio/transcription-request data to be used to improve speech-recognition models, in exchange for discounted pricing. The opt-in terms grant broad, perpetual/irrevocable use rights to the supplied training data and derived text; deleting the Cloud project does not itself delete logged data. **Launch control:** do not enable Speech-to-Text data logging for the production project; record and periodically audit that setting. The setup page describes the option as “API V1 only,” so confirm the exact setting and contractual effect for the selected V2 project with Google before relying on it. [Data logging](https://cloud.google.com/speech-to-text/docs/v1/data-logging) · [Opt-in terms](https://cloud.google.com/speech-to-text/docs/v1/data-logging-terms) · [Setup](https://cloud.google.com/speech-to-text/docs/setup)
- Data-residency language must match the actual endpoint/region—not a generic statement that data remains local. V2 was introduced with regionalized invocation, and Google’s current data-residency service list includes Cloud Speech-to-Text as an AI/ML Data Location service. Chirp 2 is only listed in the three regions above. Confirm the deployed recognizer/endpoint, Google contract terms, and any remaining support/telemetry or transfer caveats before making a region-specific promise. [V2 regionalization announcement](https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-speech-to-text-v2-api) · [Google Cloud data residency list](https://cloud.google.com/terms/data-residency)

### Gemini API

- Do not use unpaid Gemini API quota for meeting-derived content. Google’s Additional Terms say that, for unpaid services, Google may use submitted content and generated responses to provide, improve, and develop products/ML technologies; human reviewers may read, annotate, and process inputs/outputs. The terms expressly say not to submit sensitive, confidential, or personal information to unpaid services. [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- A Gemini API request is a paid service only when it is made through a Cloud project with an active billing account. For paid services, Google says it does not use prompts (including system instructions, cached content, and uploaded files) or responses to improve products, and processes prompts/responses under the applicable data-processing addendum. This needs an operational billing-project check, not merely a paid account elsewhere. [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- “Paid” is not zero retention. Google says paid-service prompts, contextual information, and outputs are retained for **55 days** for abuse detection/prevention and required legal/regulatory disclosures; flagged content may be assessed by authorized personnel. The same documentation says that logging is only for policy enforcement, not training/fine-tuning other than enforcement models. [Abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies)
- Paid Gemini data may be stored transiently or cached in any country where Google or its agents have facilities. Do not promise Gemini regional processing/residency based solely on the Speech-to-Text location. For a requirement for guaranteed zero retention or enterprise DPAs, Google’s Gemini Developer API ZDR guidance points customers to Vertex AI. [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) · [ZDR guidance](https://ai.google.dev/gemini-api/docs/zdr)
- Feature choices change retention:
  - Google Search grounding stores prompts, supplied context, and outputs for 30 days; Google Maps grounding also stores them for 30 days. Google says these stores cannot be disabled while using the features. [ZDR guidance](https://ai.google.dev/gemini-api/docs/zdr)
  - Explicit context caches persist until the configured TTL/expiry; implicit caching is in RAM, isolated to the project, with a 24-hour TTL. [ZDR guidance](https://ai.google.dev/gemini-api/docs/zdr)
  - Gemini Files API uploads are automatically deleted after 48 hours, but can be deleted earlier. File Search embeddings/data persist until manually deleted (or model deprecation), even though raw files expire. [Files API](https://ai.google.dev/gemini-api/docs/files) · [File Search](https://ai.google.dev/gemini-api/docs/file-search)
  - If using the Interactions API, stored conversation state is on by default unless `store: false`; Live API session-resumption state can retain conversation text/audio/video for up to 24 hours. [ZDR guidance](https://ai.google.dev/gemini-api/docs/zdr)

## Actionable policy and launch checklist

### Product disclosures and notice

- [ ] Before recording begins, give every participant clear, intelligible notice that Stratis captures meeting audio, creates a transcript through Google Cloud Speech-to-Text, and uses selected transcript-derived material with Gemini to generate evidence/questions. Identify Stratis's role and link the current Privacy Policy.
- [ ] State what is sent at each stage: audio to Google Speech-to-Text; transcript/excerpts plus any metadata or instructions to Gemini; generated evidence/questions back to Stratis. Do not imply that the AI output is a recording, a complete account, or verified fact.
- [ ] Explain the purpose: transcription and meeting-support analysis. State whether audio, full transcripts, excerpts, speakers/names, meeting titles, participant identifiers, prompts, outputs, audit events, and support/diagnostic logs are collected/stored; omit categories that the product does not actually collect.
- [ ] Name Google as a service provider/subprocessor (with links to the relevant Google terms/DPA as appropriate), disclose cross-border processing where applicable, and distinguish the Speech-to-Text deployment region from Gemini’s paid API processing/abuse-log conditions.
- [ ] Put a just-in-time recording/AI notice in the meeting UI—not only in account terms—and make it accessible to guests who do not hold a Stratis account.

### Consent, controls, and expectations

- [ ] Require the organizer/host to confirm they have authority to notify/obtain any permissions required for all participants. Provide a visible recording/AI-processing indicator and a practical way to decline, leave, or participate without being recorded where the product supports it.
- [ ] Obtain and store an affirmative, timestamped acknowledgement/consent event where Stratis's chosen policy requires it; do not rely on a generic account acceptance for meeting guests.
- [ ] Offer a clear pre-meeting control to disable recording and AI analysis. If audio is recorded but AI analysis can be disabled independently, present those as separate choices.
- [ ] Set expectations for accuracy, automated nature, appropriate human review, and non-use for high-impact decisions without appropriate review. Provide a path to report/correct or delete inaccurate meeting content where available.

### Retention, deletion, and access

- [ ] Define Stratis retention schedules separately for raw audio, transcripts, transcript-derived evidence/questions, user/meeting metadata, backups, logs, and deleted-item recovery. Publish the customer-facing periods and the deletion process; avoid “we delete immediately” unless backups and downstream vendors support that claim.
- [ ] Provide authorized workspace controls to export and delete a meeting and its associated artifacts; propagate deletion to application databases, object storage, search/vector indexes, queues, analytics, and backups according to a documented schedule. Keep a deletion audit trail that does not contain unnecessary meeting content.
- [ ] Use request-only Gemini calls with minimized/redacted excerpts. Do not upload meeting audio/transcripts through Gemini Files, File Search, explicit caching, Interactions state, or Live session resumption unless the feature is approved, disclosed, and has a deletion/retention owner.
- [ ] Treat Google’s 55-day paid-Gemini abuse-monitoring retention, and 30-day grounding retention if grounding is enabled, as vendor-side exceptions that Stratis cannot present as instant deletion. Do not enable Google Search/Maps grounding for meeting content unless this is specifically approved and disclosed.

### Engineering, contracts, and operating controls

- [ ] Enforce a billing-enabled Gemini Cloud project; deny/alert on unpaid quota or AI Studio paths. Maintain a configuration inventory proving the API route, project, model, region, Speech-to-Text data-logging status, and enabled Gemini features.
- [ ] Keep Speech-to-Text data logging disabled in production. Restrict cloud IAM/service-account access, encrypt data in transit/at rest, separate environments, rotate secrets, and avoid content in application logs, tracing, error reports, and support tickets.
- [ ] Select and document the Speech-to-Text V2 region/endpoint and its rationale. Verify current Chirp 2 availability and data-location commitments before launch or regional changes.
- [ ] Obtain and maintain applicable Google Cloud agreements/DPA and a subprocessor/vendor record. Confirm product eligibility, data-location terms, incident/support access, security measures, deletion commitments, and any customer-contract flow-downs with procurement/privacy owners.
- [ ] Conduct a pre-launch data-flow review and repeat it for new AI features. Test: recording disabled; AI disabled; participant notice; access boundaries; deletion propagation; no raw content in logs; billing/paid-Gemini enforcement; and no unapproved grounding/files/cache/state features.
- [ ] Establish an incident-response and user-request process for meeting data, including ownership, authentication, export/deletion requests, vendor escalation, and evidence retention. Train support staff not to request raw recordings/transcripts unless necessary and authorized.

## Suggested policy-language boundaries

Use precise, configurable language such as: “When enabled by the meeting host, Stratis processes meeting audio to create a transcript using Google Cloud Speech-to-Text and sends the transcript or selected excerpts to Google Gemini to generate meeting-support features.” Add the actual retention periods and regions only after configuration verification. Avoid unqualified statements such as “AI providers never retain data,” “data never leaves [country],” “we delete everything immediately,” or “AI outputs are accurate.”

## Sources reviewed

All sources below are official Google documentation/terms and should be rechecked at launch because service terms and feature behavior may change.

1. [Cloud Speech-to-Text: Chirp 2](https://cloud.google.com/speech-to-text/docs/models/chirp-2)
2. [Cloud Speech-to-Text: Data usage FAQ](https://cloud.google.com/speech-to-text/docs/v1/data-usage-faq)
3. [Cloud Speech-to-Text: Data logging](https://cloud.google.com/speech-to-text/docs/v1/data-logging) and [opt-in terms](https://cloud.google.com/speech-to-text/docs/v1/data-logging-terms)
4. [Google Cloud: services with data residency](https://cloud.google.com/terms/data-residency)
5. [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms)
6. [Gemini API: abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies)
7. [Gemini API: zero data retention](https://ai.google.dev/gemini-api/docs/zdr)
8. [Gemini API: Files](https://ai.google.dev/gemini-api/docs/files) and [File Search](https://ai.google.dev/gemini-api/docs/file-search)
