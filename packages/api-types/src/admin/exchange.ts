import { type TScheduledFxConversionStatus } from './constants';
import { type TAdminListPagination } from './pagination';

/**
 * Admin exchange rules list: search params (query string shape).
 */
export type TAdminExchangeRulesListQuery = TAdminListPagination & {
  q?: string;
  enabled?: string;
  includeDeleted?: string;
};

/**
 * Admin exchange scheduled conversions list: search params (query string shape).
 */
export type TAdminExchangeScheduledListQuery = TAdminListPagination & {
  q?: string;
  status?: TScheduledFxConversionStatus;
  includeDeleted?: string;
};
