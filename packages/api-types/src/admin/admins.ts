import { type TAdminType } from './constants';
import { type TAdminListPagination } from './pagination';

/**
 * Admin admins list: search params (query string shape).
 */
export type TAdminAdminsListQuery = TAdminListPagination & {
  q?: string;
  type?: TAdminType;
  includeDeleted?: string;
};
