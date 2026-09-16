# Desktop release manifest

`public/desktop/latest.json` is intentionally absent until a verified public
GitHub Release exists. The download page and the Windows app both treat a
missing, malformed, or untrusted manifest as unavailable.

After the release owner has verified the installer asset, publish one JSON
object with these string fields:

| Field | Required value |
| --- | --- |
| `version` | Stable `major.minor.patch` release version, without prerelease/build suffixes or leading zeroes. |
| `publishedAt` | UTC timestamp in `YYYY-MM-DDTHH:mm:ssZ` form. |
| `installerUrl` | HTTPS URL beneath `https://github.com/PreturnPRO/Stratis/releases/` for the verified Windows installer asset. |
| `sha256` | The installer's 64-character lowercase hexadecimal SHA-256. |
| `releaseNotesUrl` | HTTPS URL beneath `https://github.com/PreturnPRO/Stratis/releases/` for that release's notes. |
| `minimumSupportedVersion` | Stable `major.minor.patch` version, using the same format rules as `version`. |

Do not create or update this public file before the matching GitHub asset is
publicly reachable. The website must never point users at a guessed or
unverified executable.
