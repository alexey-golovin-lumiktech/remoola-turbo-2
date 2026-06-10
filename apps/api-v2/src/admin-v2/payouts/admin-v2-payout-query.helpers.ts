import { $Enums, type Prisma } from '@remoola/database-2';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
export const PAYOUT_TYPES = [$Enums.LedgerEntryType.USER_PAYOUT, $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL] as const;

export function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

export function buildCreatedAtCursorWhere(
  cursor: { createdAt: Date; id: string } | null,
): Prisma.LedgerEntryModelWhereInput {
  if (!cursor) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
      },
    ],
  };
}
