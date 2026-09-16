import { useEffect, useState } from "react";
import { Download as DownloadIcon, ExternalLink } from "lucide-react";
import { FONT, LETTER_SPACING, RADIUS, SPACE } from "../tokens/colors";
import { useTheme } from "../hooks/useTheme";
import {
  parseDesktopReleaseManifest,
  type DesktopReleaseManifest,
} from "./downloadManifest";

type DownloadState =
  | { kind: "loading" }
  | { kind: "available"; manifest: DesktopReleaseManifest }
  | { kind: "unavailable" };

const UNAVAILABLE_MESSAGE = "Download details are temporarily unavailable.";

function formatReleaseDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export default function Download() {
  const { colors, shadow } = useTheme();
  const [state, setState] = useState<DownloadState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/desktop/latest.json", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Release manifest was unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const manifest = parseDesktopReleaseManifest(value);
        setState(manifest ? { kind: "available", manifest } : { kind: "unavailable" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "unavailable" });
      });

    return () => controller.abort();
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "72px 24px 40px",
        background: colors.bg,
        color: colors.text,
      }}
    >
      <section
        aria-labelledby="download-title"
        style={{
          width: "100%",
          maxWidth: 620,
          padding: "clamp(28px, 6vw, 48px)",
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: RADIUS.xl,
          boxShadow: shadow.shadCard,
        }}
      >
        <p
          style={{
            margin: `0 0 ${SPACE[3]}px`,
            color: colors.accent,
            fontFamily: FONT.mono,
            fontSize: FONT.size.caption,
            fontWeight: FONT.weight.bold,
            letterSpacing: LETTER_SPACING.eyebrow,
          }}
        >
          STRATIS FOR WINDOWS
        </p>
        <h1
          id="download-title"
          style={{
            margin: 0,
            color: colors.text,
            fontSize: "clamp(30px, 5vw, 42px)",
            lineHeight: 1.1,
            letterSpacing: -0.8,
          }}
        >
          Download Stratis
        </h1>

        {state.kind === "loading" && (
          <p role="status" style={{ margin: `${SPACE[6]}px 0 0`, color: colors.textMuted, lineHeight: 1.6 }}>
            Checking the latest verified release…
          </p>
        )}

        {state.kind === "unavailable" && (
          <p role="status" style={{ margin: `${SPACE[6]}px 0 0`, color: colors.textMuted, lineHeight: 1.6 }}>
            {UNAVAILABLE_MESSAGE}
          </p>
        )}

        {state.kind === "available" && (
          <div style={{ marginTop: SPACE[6] }}>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: FONT.size.body, lineHeight: 1.65 }}>
              Version {state.manifest.version} · Released {formatReleaseDate(state.manifest.publishedAt)}
            </p>
            <a
              href={state.manifest.installerUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: SPACE[2],
                marginTop: SPACE[5],
                padding: "11px 18px",
                borderRadius: RADIUS.pill,
                background: colors.accent,
                color: colors.onAccent,
                fontSize: FONT.size.body,
                fontWeight: FONT.weight.bold,
                textDecoration: "none",
              }}
            >
              <DownloadIcon size={17} aria-hidden="true" />
              Download for Windows
            </a>
            <p style={{ margin: `${SPACE[5]}px 0 0`, color: colors.textMuted, fontSize: FONT.size.body, lineHeight: 1.65 }}>
              Download the installer, then run it to install Stratis. If Stratis is already installed,
              running the installer upgrades it and keeps your local data.
            </p>
            <a
              href={state.manifest.releaseNotesUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: SPACE[4],
                color: colors.accent,
                fontSize: FONT.size.body,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Release notes
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        )}

        <nav
          aria-label="Legal information"
          style={{ display: "flex", flexWrap: "wrap", gap: SPACE[4], marginTop: SPACE[6], fontSize: FONT.size.caption }}
        >
          <a href="/privacy" style={{ color: colors.accent, textUnderlineOffset: 3 }}>
            Privacy Notice
          </a>
          <a href="/terms" style={{ color: colors.accent, textUnderlineOffset: 3 }}>
            Terms of Use
          </a>
        </nav>
      </section>
    </main>
  );
}
