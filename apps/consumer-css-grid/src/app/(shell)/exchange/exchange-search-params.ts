export type ExchangeSearchParams = Record<string, string | string[] | undefined>;

export const EXCHANGE_PAGE_SIZE_DEFAULT = 10;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function parsePositiveInt(value: string | string[] | undefined, fallback: number) {
  return Math.max(1, Number(getSingleValue(value)) || fallback);
}

export function parseExchangePaginationParams(searchParams?: ExchangeSearchParams) {
  return {
    rulesPage: parsePositiveInt(searchParams?.rulesPage, 1),
    rulesPageSize: parsePositiveInt(searchParams?.rulesPageSize, EXCHANGE_PAGE_SIZE_DEFAULT),
    scheduledPage: parsePositiveInt(searchParams?.scheduledPage, 1),
    scheduledPageSize: parsePositiveInt(searchParams?.scheduledPageSize, EXCHANGE_PAGE_SIZE_DEFAULT),
  };
}
