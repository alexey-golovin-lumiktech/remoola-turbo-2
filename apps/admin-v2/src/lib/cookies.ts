import { getSetCookieValues } from './api-utils';

export function parseCookieHeader(header: string | null | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? ``).split(`;`)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex);
    if (cookies.has(key)) continue;
    cookies.set(key, trimmed.slice(separatorIndex + 1));
  }
  return cookies;
}

export function getCookieValue(header: string | null | undefined, key: string): string | null {
  return parseCookieHeader(header).get(key) ?? null;
}

export function getPreferredCookieValue(
  header: string | null | undefined,
  preferredKey: string,
  readableKeys: ReadonlyArray<string>,
): string | undefined {
  const cookies = parseCookieHeader(header);
  const orderedKeys = [preferredKey, ...readableKeys.filter((key) => key !== preferredKey)];
  for (const key of orderedKeys) {
    const value = cookies.get(key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function mergeSetCookieValuesIntoHeader(
  cookieHeader: string | null | undefined,
  setCookieValues: ReadonlyArray<string>,
): string {
  const cookies = parseCookieHeader(cookieHeader);
  for (const setCookie of setCookieValues) {
    const firstSegment = setCookie.split(`;`, 1)[0] ?? ``;
    const separatorIndex = firstSegment.indexOf(`=`);
    if (separatorIndex <= 0) continue;
    cookies.set(firstSegment.slice(0, separatorIndex), firstSegment.slice(separatorIndex + 1));
  }
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join(`; `);
}

export function mergeSetCookieHeadersIntoHeader(
  cookieHeader: string | null | undefined,
  responseHeaders: Headers,
): string {
  return mergeSetCookieValuesIntoHeader(cookieHeader, getSetCookieValues(responseHeaders));
}
