import { type Prisma } from '@remoola/database-2';

type CreatedAtIdCursor = {
  createdAt: Date;
  id: string;
} | null;

type CreatedAtIdCursorWhere = {
  OR: Array<{ createdAt: { lt: Date } } | { AND: [{ createdAt: Date }, { id: { lt: string } }] }>;
};

export function buildCreatedAtIdCursorWhere(cursor: CreatedAtIdCursor): CreatedAtIdCursorWhere | Record<string, never> {
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

export function buildDateRangeFilter(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeFilter | undefined {
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
