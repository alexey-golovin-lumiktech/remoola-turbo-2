type SearchParamValue = string | string[] | undefined;

const MAX_CONSUMER_LIST_PAGE_SIZE = 100;

function getSingleValue(value: SearchParamValue): string {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function parsePositiveInteger(value: SearchParamValue, fallback: number): number {
  const parsed = Number(getSingleValue(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function parseListPage(value: SearchParamValue, fallback = 1): number {
  return parsePositiveInteger(value, fallback);
}

export function parseListPageSize(
  value: SearchParamValue,
  fallback: number,
  max = MAX_CONSUMER_LIST_PAGE_SIZE,
): number {
  return Math.min(max, parsePositiveInteger(value, fallback));
}

export function parseListPagination(
  searchParams: Record<string, SearchParamValue> | undefined,
  defaults: { pageSize: number; page?: number },
): { page: number; pageSize: number } {
  return {
    page: parseListPage(searchParams?.page, defaults.page ?? 1),
    pageSize: parseListPageSize(searchParams?.pageSize, defaults.pageSize),
  };
}
