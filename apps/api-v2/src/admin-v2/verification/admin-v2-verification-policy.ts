import { $Enums } from '@remoola/database-2';

import { type AdminV2VerificationDecisionState } from './admin-v2-verification.repository';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';

export const ACTIVE_VERIFICATION_STATUSES = [
  $Enums.VerificationStatus.PENDING,
  $Enums.VerificationStatus.MORE_INFO,
  $Enums.VerificationStatus.FLAGGED,
] as const;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const REASON_MAX_LENGTH = 500;

export type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type DecisionControls = {
  canForceLogout: boolean;
  canDecide: boolean;
  allowedActions: string[];
  canManageAssignments: boolean;
  canReassignAssignments: boolean;
};

export type VerificationDecision = `approve` | `reject` | `request-info` | `flag`;

export type VerificationDecisionConfig = {
  nextState: AdminV2VerificationDecisionState;
  actionName: (typeof ADMIN_ACTION_AUDIT_ACTIONS)[keyof typeof ADMIN_ACTION_AUDIT_ACTIONS];
  notificationType: `email` | null;
};

export const VERIFICATION_DECISION_CONFIG = {
  approve: {
    nextState: { verificationStatus: $Enums.VerificationStatus.APPROVED, verified: true, legalVerified: true },
    actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_approve,
    notificationType: `email`,
  },
  reject: {
    nextState: { verificationStatus: $Enums.VerificationStatus.REJECTED, verified: false, legalVerified: false },
    actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_reject,
    notificationType: `email`,
  },
  'request-info': {
    nextState: { verificationStatus: $Enums.VerificationStatus.MORE_INFO, verified: false, legalVerified: false },
    actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_request_info,
    notificationType: `email`,
  },
  flag: {
    nextState: { verificationStatus: $Enums.VerificationStatus.FLAGGED, verified: false, legalVerified: false },
    actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_flag,
    notificationType: null,
  },
} satisfies Record<VerificationDecision, VerificationDecisionConfig>;

export function normalizePage(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE));
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize };
}

export function normalizeReason(reason?: string | null): string | null {
  const normalized = reason?.trim();
  if (!normalized) return null;
  return normalized.slice(0, REASON_MAX_LENGTH);
}

export function normalizeActiveStatuses(status?: string): Array<$Enums.VerificationStatus> {
  return status && ACTIVE_VERIFICATION_STATUSES.includes(status as (typeof ACTIVE_VERIFICATION_STATUSES)[number])
    ? [status as (typeof ACTIVE_VERIFICATION_STATUSES)[number]]
    : [...ACTIVE_VERIFICATION_STATUSES];
}

export function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

export function hasMissingProfileData(item: {
  accountType: $Enums.AccountType;
  personalDetails: { firstName: string | null; lastName: string | null } | null;
  organizationDetails: { name: string | null } | null;
  addressDetails: { country: string } | null;
}): boolean {
  const missingName =
    item.accountType === $Enums.AccountType.BUSINESS
      ? !item.organizationDetails?.name?.trim()
      : !item.personalDetails?.firstName?.trim() || !item.personalDetails?.lastName?.trim();
  return missingName || !item.addressDetails?.country?.trim();
}
