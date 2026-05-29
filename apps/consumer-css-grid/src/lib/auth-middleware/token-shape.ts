import { type NextRequest } from 'next/server';

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

export function getPreferredCookieValue(
  req: NextRequest,
  preferredKey: string,
  readableKeys: readonly string[],
): string | undefined {
  const orderedKeys = [preferredKey, ...readableKeys.filter((key) => key !== preferredKey)];
  for (const key of orderedKeys) {
    const value = req.cookies.get(key)?.value;
    if (value) return value;
  }
  return undefined;
}

export function isObviouslyInvalidCookieToken(token: string | undefined): boolean {
  if (!token) return true;
  if (token.length > 4096) return true;
  return /[\r\n;]/.test(token);
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, `+`).replace(/_/g, `/`);
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, `=`);
    return decodeURIComponent(
      Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, `0`)}`).join(``),
    );
  } catch {
    return null;
  }
}

export function hasPotentialAccessToken(accessToken: string): boolean {
  const parts = accessToken.split(`.`);
  if (parts.length !== 3) return false;

  const headerJson = decodeBase64Url(parts[0] ?? ``);
  const payloadJson = decodeBase64Url(parts[1] ?? ``);
  if (!headerJson || !payloadJson) return false;

  try {
    const header = JSON.parse(headerJson) as { alg?: unknown; typ?: unknown };
    const payload = JSON.parse(payloadJson) as { exp?: unknown; typ?: unknown };
    return (
      header.alg === `HS256` &&
      payload.typ === `access` &&
      typeof payload.exp === `number` &&
      payload.exp * 1000 > Date.now() + ACCESS_TOKEN_EXPIRY_SKEW_MS
    );
  } catch {
    return false;
  }
}
