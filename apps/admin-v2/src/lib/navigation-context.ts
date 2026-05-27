import { buildQueryString } from './query-contract';

type SearchParamValue = string | number | boolean | null | undefined;

export function buildPathWithSearch(pathname: string, params: Record<string, SearchParamValue>): string {
  const query = buildQueryString(params);
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export function withReturnTo(targetHref: string, returnTo: string): string {
  if (!returnTo) {
    return targetHref;
  }

  const url = new URL(targetHref, `http://localhost`);
  url.searchParams.set(`from`, returnTo);

  const query = url.searchParams.toString();
  return query.length > 0 ? `${url.pathname}?${query}` : url.pathname;
}

export function readReturnTo(raw: string | string[] | undefined, fallbackHref: string): string {
  if (typeof raw !== `string` || raw.trim().length === 0) {
    return fallbackHref;
  }

  try {
    const normalized = new URL(raw, `http://localhost`);
    const path = normalized.pathname;
    const query = normalized.searchParams.toString();

    if (!path.startsWith(`/`)) {
      return fallbackHref;
    }

    return query.length > 0 ? `${path}?${query}` : path;
  } catch {
    return fallbackHref;
  }
}
