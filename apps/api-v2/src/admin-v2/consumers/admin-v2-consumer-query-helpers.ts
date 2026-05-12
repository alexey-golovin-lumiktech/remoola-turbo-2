import { $Enums } from '@remoola/database-2';

const MAX_PAGE_SIZE = 100;
const DEFAULT_HISTORY_PAGE_SIZE = 10;

export const ACCOUNT_TYPES = Object.values($Enums.AccountType) as string[];
export const VERIFICATION_STATUSES = Object.values($Enums.VerificationStatus) as string[];
export const CONTRACTOR_KINDS = Object.values($Enums.ContractorKind) as string[];

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
