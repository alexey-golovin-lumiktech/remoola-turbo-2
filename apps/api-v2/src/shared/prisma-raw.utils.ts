import { Prisma } from '@remoola/database-2';

type PaymentRequestRole = `PAYER` | `REQUESTER`;
type CreatedAtIdCursor = {
  createdAt: Date;
  id: string;
} | null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Raw SQL policy: never use $queryRawUnsafe; interpolate dynamic values only via Prisma.sql/Prisma.join.
// Keep row aliases aligned with TS row types, cast COUNT(*) to ::int, and keep cursor predicates in the same
// tuple order as the matching ORDER BY clause.

export class SqlValidationError extends Error {
  constructor(
    readonly code: string,
    readonly label: string,
    message: string,
  ) {
    super(message);
    this.name = `SqlValidationError`;
  }
}

class InvalidSqlUuidError extends SqlValidationError {
  constructor(
    readonly label: string,
    readonly value: string,
  ) {
    super(`INVALID_SQL_UUID`, label, `${label} must be a valid UUID`);
    this.name = `InvalidSqlUuidError`;
  }
}

function normalizeUuid(value: string): string | null {
  const normalizedValue = value.trim();
  if (!isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function sqlUuid(value: string): Prisma.Sql {
  const normalizedValue = normalizeUuid(value);
  return normalizedValue ? Prisma.sql`${normalizedValue}::uuid` : Prisma.sql`NULL::uuid`;
}

export function sqlRequiredUuid(value: string, label = `UUID`): Prisma.Sql {
  const normalizedValue = normalizeUuid(value);
  if (!normalizedValue) {
    throw new InvalidSqlUuidError(label, value);
  }

  return Prisma.sql`${normalizedValue}::uuid`;
}

export function sqlRequiredUuidArray(values: readonly string[], label = `UUID list`): Prisma.Sql {
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => sqlRequiredUuid(value, label)))}]::uuid[]`;
}

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === `string` && UUID_REGEX.test(value.trim());
}

export function assertRawUuid(value: unknown, label = `raw UUID`): string {
  if (typeof value !== `string` || !isUuid(value)) {
    throw new InvalidSqlUuidError(label, String(value));
  }

  return value;
}

export function assertRawDate(value: unknown, label = `raw date`): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new SqlValidationError(`INVALID_SQL_DATE`, label, `${label} must be a valid Date`);
  }

  return value;
}

export function parseRawFiniteNumber(value: unknown, label = `raw number`): number {
  const numericValue =
    typeof value === `object` && value != null && `toString` in value ? Number(value.toString()) : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new SqlValidationError(`INVALID_SQL_NUMBER`, label, `${label} must be a finite number`);
  }

  return numericValue;
}

export function sqlInList(values: readonly string[]): Prisma.Sql {
  if (values.length === 0) {
    throw new SqlValidationError(`INVALID_SQL_LIST`, `SQL IN list`, `sqlInList requires at least one value`);
  }

  return Prisma.join(values.map((value) => Prisma.sql`${value}`));
}

export function buildOptionalUuidEqualsSql(columnSql: Prisma.Sql, value: string | undefined): Prisma.Sql {
  if (!value?.trim()) {
    return Prisma.empty;
  }

  const normalizedValue = value.trim();
  if (!isUuid(normalizedValue)) {
    return Prisma.sql`AND FALSE`;
  }

  return Prisma.sql`AND ${columnSql} = ${sqlUuid(normalizedValue)}`;
}

export function buildDateRangeSql(columnSql: Prisma.Sql, range: { from?: Date; to?: Date }): Prisma.Sql {
  if (range.from && range.to) {
    return Prisma.sql`AND ${columnSql} >= ${range.from} AND ${columnSql} <= ${range.to}`;
  }

  if (range.from) {
    return Prisma.sql`AND ${columnSql} >= ${range.from}`;
  }

  if (range.to) {
    return Prisma.sql`AND ${columnSql} <= ${range.to}`;
  }

  return Prisma.empty;
}

export function buildDescendingCreatedAtIdCursorSql(params: {
  timestampColumn: Prisma.Sql;
  idColumn: Prisma.Sql;
  cursor: CreatedAtIdCursor;
}): Prisma.Sql {
  if (!params.cursor) {
    return Prisma.empty;
  }
  if (!isUuid(params.cursor.id)) {
    return Prisma.sql`AND FALSE`;
  }

  return Prisma.sql`
    AND (
      ${params.timestampColumn} < ${params.cursor.createdAt}
      OR (${params.timestampColumn} = ${params.cursor.createdAt} AND ${params.idColumn} < ${sqlUuid(params.cursor.id)})
    )
  `;
}

export function buildPaymentRequestParticipantIdsSql(params: {
  consumerId: string;
  consumerEmail: string | null;
  role?: PaymentRequestRole;
}): Prisma.Sql {
  const { consumerId, consumerEmail, role } = params;
  const consumerIdSql = sqlUuid(consumerId);
  const branches: Prisma.Sql[] = [];

  if (role !== `REQUESTER`) {
    branches.push(Prisma.sql`
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.payer_id = ${consumerIdSql}
    `);
  }

  if (role !== `PAYER`) {
    branches.push(Prisma.sql`
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.requester_id = ${consumerIdSql}
    `);
  }

  if (consumerEmail) {
    if (role !== `REQUESTER`) {
      branches.push(Prisma.sql`
        SELECT pr.id
        FROM payment_request pr
        WHERE pr.deleted_at IS NULL
          AND pr.payer_id IS NULL
          AND LOWER(COALESCE(pr.payer_email, '')) = ${consumerEmail}
      `);
    }

    if (role !== `PAYER`) {
      branches.push(Prisma.sql`
        SELECT pr.id
        FROM payment_request pr
        WHERE pr.deleted_at IS NULL
          AND pr.requester_id IS NULL
          AND LOWER(COALESCE(pr.requester_email, '')) = ${consumerEmail}
      `);
    }
  }

  return branches.length === 1 ? branches[0]! : Prisma.join(branches, ` UNION `);
}
