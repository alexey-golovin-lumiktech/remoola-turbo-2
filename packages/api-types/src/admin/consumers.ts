import { type TAccountType, type TContractorKind, type TVerificationStatus } from '../auth';
import { type TAdminListPagination } from './pagination';

/**
 * Admin consumers list: search params (query string shape).
 * Extends pagination; enum fields use shared auth/constants.
 */
export type TAdminConsumersListQuery = TAdminListPagination & {
  q?: string;
  accountType?: TAccountType;
  contractorKind?: TContractorKind;
  verificationStatus?: TVerificationStatus;
  verified?: string;
  includeDeleted?: string;
};
