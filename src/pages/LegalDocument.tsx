import { FONT, RADIUS, SPACE } from "../tokens/colors";
import { useTheme } from "../hooks/useTheme";
import { getLegalDocument, type LegalDocumentId } from "../lib/legalDocuments";

export default function LegalDocumentPage({
  documentId,
}: {
  documentId: LegalDocumentId;
}) {
  const { colors, shadow } = useTheme();
  const document = getLegalDocument(documentId);

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "clamp(32px, 7vw, 80px) 24px",
        background: colors.bg,
        color: colors.text,
      }}
    >
      <article style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
        <nav aria-label="Public pages" style={{ display: "flex", flexWrap: "wrap", gap: SPACE[4], marginBottom: SPACE[8] }}>
          <a href="/" style={{ color: colors.accent, textUnderlineOffset: 3 }}>Home</a>
          <a href="/download" style={{ color: colors.accent, textUnderlineOffset: 3 }}>Download</a>
        </nav>

        <div
          role="note"
          style={{
            marginBottom: SPACE[6],
            padding: `${SPACE[4]}px ${SPACE[5]}px`,
            border: `1px solid ${colors.accent}`,
            borderRadius: RADIUS.lg,
            background: colors.surfaceElevated,
            boxShadow: shadow.shadCard,
            color: colors.text,
            fontSize: FONT.size.body,
            lineHeight: 1.6,
          }}
        >
          <strong>Beta document</strong>
          <br />
          Stratis is a pre-incorporation beta. Its identity, contact details, and data-retention details are being finalised. This document may change before production launch.
        </div>

        <header style={{ marginBottom: SPACE[8] }}>
          <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.1 }}>
            {document.title}
          </h1>
          <p style={{ margin: `${SPACE[4]}px 0 0`, color: colors.textMuted, fontSize: FONT.size.body }}>
            Version {document.version} · Effective {document.effectiveDate}
          </p>
        </header>

        {document.sections.map((section) => (
          <section key={section.heading} style={{ marginTop: SPACE[8] }}>
            <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 26px)", lineHeight: 1.25 }}>
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ margin: `${SPACE[4]}px 0 0`, color: colors.textMuted, fontSize: FONT.size.body, lineHeight: 1.7 }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
