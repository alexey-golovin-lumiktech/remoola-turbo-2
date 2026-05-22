import { parseListPage, parseListPageSize } from '../../../lib/pagination';

export type ExchangeSearchParams = Record<string, string | string[] | undefined>;

export const EXCHANGE_PAGE_SIZE_DEFAULT = 10;

export function parseExchangePaginationParams(searchParams?: ExchangeSearchParams) {
  return {
    rulesPage: parseListPage(searchParams?.rulesPage, 1),
    rulesPageSize: parseListPageSize(searchParams?.rulesPageSize, EXCHANGE_PAGE_SIZE_DEFAULT),
    scheduledPage: parseListPage(searchParams?.scheduledPage, 1),
    scheduledPageSize: parseListPageSize(searchParams?.scheduledPageSize, EXCHANGE_PAGE_SIZE_DEFAULT),
  };
}
