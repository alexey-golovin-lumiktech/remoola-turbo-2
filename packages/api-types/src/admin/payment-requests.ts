import { type TAdminListPagination } from './pagination';
import { type TTransactionStatus } from '../payments';

/**
 * Admin payment requests list: search params (query string shape).
 */
export type TAdminPaymentRequestsListQuery = TAdminListPagination & {
  q?: string;
  status?: TTransactionStatus;
  includeDeleted?: string;
};

/**
 * Admin expectation-date archive: search params (query string shape).
 */
export type TAdminExpectationDateArchiveQuery = TAdminListPagination & {
  q?: string;
};
