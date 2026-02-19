import { type TLedgerEntryType } from './constants';
import { type TAdminListPagination } from './pagination';
import { type TTransactionStatus } from '../payments';

/**
 * Admin ledger list: search params (query string shape).
 */
export type TAdminLedgerListQuery = TAdminListPagination & {
  q?: string;
  type?: TLedgerEntryType;
  status?: TTransactionStatus;
  includeDeleted?: string;
};
