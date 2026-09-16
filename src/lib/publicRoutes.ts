export function publicRouteForPath(
  pathname: string,
): "download" | "privacy" | "terms" | null {
  switch (pathname) {
    case "/download":
      return "download";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    default:
      return null;
  }
}
