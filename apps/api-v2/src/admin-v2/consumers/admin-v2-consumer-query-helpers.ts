import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

const FLAG_MAX_LEN = 64;
const REASON_MAX_LEN = 500;
const MAX_PAGE_SIZE = 100;
const DEFAULT_HISTORY_PAGE_SIZE = 10;

export const ACCOUNT_TYPES = Object.values($Enums.AccountType) as string[];
export const VERIFICATION_STATUSES = Object.values($Enums.VerificationStatus) as string[];
export const CONTRACTOR_KINDS = Object.values($Enums.ContractorKind) as string[];

export function normalizeFlag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, `_`)
    .replace(/^_+|_+$/g, ``)
    .slice(0, FLAG_MAX_LEN);
}

export function mapConsumerDisplayName(item: {
  organizationDetails?: { name?: string | null } | null;
  personalDetails?: { firstName?: string | null; lastName?: string | null } | null;
}): string | null {
  return (
    item.organizationDetails?.name ??
    [item.personalDetails?.firstName, item.personalDetails?.lastName].filter(Boolean).join(` `) ??
    null
  );
}

export function mapPaymentMethodStatus(paymentMethod: { disabledAt?: Date | null }): `ACTIVE` | `DISABLED` {
  return paymentMethod.disabledAt ? `DISABLED` : `ACTIVE`;
}

export function normalizeOptionalReason(raw: string | null | undefined): string | null {
  return raw?.trim() ? raw.trim().slice(0, REASON_MAX_LEN) : null;
}

export function validateConsumerSuspensionReason(raw: string | null | undefined): string {
  const reason = raw?.trim();
  if (!reason) {
    throw new BadRequestException(`Suspension reason is required`);
  }
  if (reason.length > REASON_MAX_LEN) {
    throw new BadRequestException(`Suspension reason is too long`);
  }
  return reason;
}

export function normalizePagination(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_HISTORY_PAGE_SIZE));
  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
  };
}

export function buildCreatedAtFilter(dateFrom?: Date, dateTo?: Date) {
  if (dateFrom && dateTo) {
    return { gte: dateFrom, lte: dateTo };
  }
  if (dateFrom) {
    return { gte: dateFrom };
  }
  if (dateTo) {
    return { lte: dateTo };
  }
  return undefined;
}
