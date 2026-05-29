export function getCookieValue(cookieHeader: string, key: string): string | null {
  for (const part of cookieHeader.split(`;`)) {
    const trimmed = part.trim();
    const idx = trimmed.indexOf(`=`);
    if (idx <= 0) continue;
    if (trimmed.slice(0, idx) === key) return trimmed.slice(idx + 1);
  }
  return null;
}

export function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? ``).split(`;`)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(`=`);
    if (idx <= 0) continue;
    const name = trimmed.slice(0, idx);
    if (cookies.has(name)) continue;
    cookies.set(name, trimmed.slice(idx + 1));
  }
  return cookies;
}
