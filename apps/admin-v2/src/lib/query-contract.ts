export type SearchParamValue = string | string[] | null | undefined;
type QueryParamValue = string | number | boolean | null | undefined;

function singleSearchParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

export function trimmedSearchParam(value: SearchParamValue): string | undefined {
  const candidate = singleSearchParam(value)?.trim();
  return candidate ? candidate : undefined;
}

export function booleanSearchParam(value: SearchParamValue): boolean | undefined {
  const candidate = trimmedSearchParam(value);
  if (candidate === `true`) return true;
  if (candidate === `false`) return false;
  return undefined;
}

export function positiveIntegerSearchParam(value: SearchParamValue, fallback?: number): number | undefined {
  const candidate = trimmedSearchParam(value);
  if (!candidate) return fallback;

  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function finiteNumberSearchParam(value: SearchParamValue): number | undefined {
  const candidate = trimmedSearchParam(value);
  if (!candidate) return undefined;

  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function dateSearchParam(value: SearchParamValue): string | undefined {
  const candidate = trimmedSearchParam(value);
  if (!candidate) return undefined;

  return isDateOnly(candidate) ? candidate : undefined;
}

export function pathSegment(value: SearchParamValue): string | undefined {
  const candidate = trimmedSearchParam(value);
  return candidate ? encodeURIComponent(candidate) : undefined;
}

export function buildQueryString(params: Record<string, QueryParamValue>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;

    if (typeof value === `string`) {
      const normalized = value.trim();
      if (normalized) {
        searchParams.set(key, normalized);
      }
      continue;
    }

    if (typeof value === `number`) {
      if (Number.isFinite(value)) {
        searchParams.set(key, String(value));
      }
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

export function withQuery(path: string, params: Record<string, QueryParamValue>): string {
  const query = buildQueryString(params);
  return query ? `${path}?${query}` : path;
}
