export function parseCookieHeader(header: string | null | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? ``).split(`;`)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    cookies.set(trimmed.slice(0, separatorIndex), trimmed.slice(separatorIndex + 1));
  }
  return cookies;
}

export function getCookieValue(header: string | null | undefined, key: string): string | null {
  for (const part of (header ?? ``).split(`;`)) {
    const trimmed = part.trim();
    const separatorIndex = trimmed.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    if (trimmed.slice(0, separatorIndex) === key) {
      return trimmed.slice(separatorIndex + 1);
    }
  }
  return null;
}
