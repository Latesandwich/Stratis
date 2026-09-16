export const BETA_LEGAL_VERSION = "2026-09-16-beta-1" as const;

export type LegalDocumentId = "privacy" | "terms";

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  version: "2026-09-16-beta-1";
  effectiveDate: "16 September 2026";
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
}

const betaNotice = {
  heading: "Beta notice",
  paragraphs: [
    "Stratis is a pre-incorporation beta project. Its identity, contact details, and data-retention details are being finalised.",
    "This document is not final production legal copy and may be revised before production launch.",
  ],
} as const;

export const LEGAL_DOCUMENTS: Readonly<Record<LegalDocumentId, LegalDocument>> = {
  privacy: {
    id: "privacy",
    title: "Beta Privacy Notice",
    version: BETA_LEGAL_VERSION,
    effectiveDate: "16 September 2026",
    sections: [
      betaNotice,
      {
        heading: "Information used during beta",
        paragraphs: [
          "Stratis may process account and workspace information, meeting metadata, audio when enabled, transcripts, evidence and questions derived from transcripts, user-supplied answers, and diagnostics necessary to operate and troubleshoot the beta.",
          "Google services process audio and selected transcript material to provide transcription and meeting-support features. Do not include information that you are not permitted to share or have processed.",
        ],
      },
      {
        heading: "Security and retention",
        paragraphs: [
          "Stratis uses reasonable security practices to help protect information, but no system is completely secure and absolute security cannot be guaranteed.",
          "Google services and configured beta features may retain data as described in this beta notice. Data-retention details are still being finalised; this notice does not promise a storage region, immediate deletion, or a retention duration.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "The identity, contact details, data-retention arrangements, and request path for deletion or export are still being finalised. Please consider this when deciding whether to use Stratis during the beta.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Beta Terms of Use",
    version: BETA_LEGAL_VERSION,
    effectiveDate: "16 September 2026",
    sections: [
      betaNotice,
      {
        heading: "Host responsibility",
        paragraphs: [
          "The person who starts transcription is responsible for giving notice and obtaining any permissions required for participants and for the meeting content before using Stratis.",
          "If a meeting uses Zoom, Meet, or another external platform, Stratis cannot identify or directly notify people who are only present in Zoom, Meet, or another external platform.",
        ],
      },
      {
        heading: "Beta output",
        paragraphs: [
          "Transcripts and AI output must be reviewed by a human before making decisions or relying on them. Stratis does not guarantee their accuracy, completeness, or suitability for any purpose.",
          "Use of Google services is limited to providing the beta features described by Stratis.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You must not record unlawfully, violate the rights of others, interfere with security, or use transcripts or AI output in high-impact contexts without appropriate human review.",
        ],
      },
    ],
  },
};

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return LEGAL_DOCUMENTS[id];
}
