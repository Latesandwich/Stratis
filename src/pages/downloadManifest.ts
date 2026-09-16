export type DesktopReleaseManifest = {
  version: string;
  publishedAt: Date;
  installerUrl: string;
  sha256: string;
  releaseNotesUrl: string;
  minimumSupportedVersion: string;
};

type ManifestRecord = Record<string, unknown>;

const STABLE_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const SHA_256 = /^[0-9a-f]{64}$/;
const PUBLISHED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RELEASE_PATH_PREFIX = "/Latesandwich/stratis-releases/releases/";

function isRecord(value: unknown): value is ManifestRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(manifest: ManifestRecord, key: string): string | null {
  const value = manifest[key];
  return typeof value === "string" ? value : null;
}

function parsePublishedAt(value: string | null): Date | null {
  if (!value || !PUBLISHED_AT.test(value)) return null;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;

  const date = new Date(timestamp);
  return date.toISOString() === value ? date : null;
}

function parseReleaseUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      !url.pathname.startsWith(RELEASE_PATH_PREFIX)
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Accepts release metadata only when it matches the public desktop update
 * contract. Keeping this pure lets a future frontend test exercise malicious
 * and malformed manifests without rendering the page or touching `fetch`.
 */
export function parseDesktopReleaseManifest(value: unknown): DesktopReleaseManifest | null {
  if (!isRecord(value)) return null;

  const version = readString(value, "version");
  const minimumSupportedVersion = readString(value, "minimumSupportedVersion");
  const publishedAt = parsePublishedAt(readString(value, "publishedAt"));
  const installerUrl = parseReleaseUrl(readString(value, "installerUrl"));
  const releaseNotesUrl = parseReleaseUrl(readString(value, "releaseNotesUrl"));
  const sha256 = readString(value, "sha256");

  if (
    !version ||
    !STABLE_VERSION.test(version) ||
    !minimumSupportedVersion ||
    !STABLE_VERSION.test(minimumSupportedVersion) ||
    !publishedAt ||
    !installerUrl ||
    !releaseNotesUrl ||
    !sha256 ||
    !SHA_256.test(sha256)
  ) {
    return null;
  }

  return {
    version,
    publishedAt,
    installerUrl,
    sha256,
    releaseNotesUrl,
    minimumSupportedVersion,
  };
}
