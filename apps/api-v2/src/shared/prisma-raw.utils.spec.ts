import { describe, expect, it } from '@jest/globals';

import { Prisma } from '@remoola/database-2';

import {
  assertRawDate,
  assertRawUuid,
  buildDateRangeSql,
  buildDescendingCreatedAtIdCursorSql,
  buildOptionalUuidEqualsSql,
  isUuid,
  parseRawFiniteNumber,
  SqlValidationError,
  sqlInList,
  sqlRequiredUuid,
  sqlRequiredUuidArray,
  sqlUuid,
} from './prisma-raw.utils';

type RenderedSql = {
  sql: string;
  values: unknown[];
};

function render(fragment: Prisma.Sql): RenderedSql {
  return fragment as unknown as RenderedSql;
}

describe(`prisma raw SQL helpers`, () => {
  it(`validates UUID values before building raw UUID filters`, () => {
    expect(isUuid(`550e8400-e29b-41d4-a716-446655440000`)).toBe(true);
    expect(isUuid(`not-a-uuid`)).toBe(false);

    expect(render(buildOptionalUuidEqualsSql(Prisma.sql`le.consumer_id`, undefined)).sql).toBe(``);
    expect(render(buildOptionalUuidEqualsSql(Prisma.sql`le.consumer_id`, `not-a-uuid`)).sql).toContain(`AND FALSE`);
    expect(
      render(buildOptionalUuidEqualsSql(Prisma.sql`le.consumer_id`, `550e8400-e29b-41d4-a716-446655440000`)).sql,
    ).toContain(`le.consumer_id`);
  });

  it(`builds date range and descending cursor predicates`, () => {
    const from = new Date(`2026-03-01T00:00:00.000Z`);
    const to = new Date(`2026-03-02T00:00:00.000Z`);
    const range = render(buildDateRangeSql(Prisma.sql`le.created_at`, { from, to }));
    expect(range.sql).toContain(`le.created_at >=`);
    expect(range.sql).toContain(`le.created_at <=`);
    expect(range.values).toEqual([from, to]);

    const cursor = render(
      buildDescendingCreatedAtIdCursorSql({
        timestampColumn: Prisma.sql`le.created_at`,
        idColumn: Prisma.sql`le.id`,
        cursor: { createdAt: to, id: `550e8400-e29b-41d4-a716-446655440000` },
      }),
    );
    expect(cursor.sql).toContain(`le.created_at <`);
    expect(cursor.sql).toContain(`le.id <`);
  });

  it(`builds SQL lists and required UUID arrays from parameterized values`, () => {
    expect(render(sqlInList([`PENDING`, `COMPLETED`])).values).toEqual([`PENDING`, `COMPLETED`]);
    expect(
      render(sqlRequiredUuidArray([`550e8400-e29b-41d4-a716-446655440000`, `550e8400-e29b-41d4-a716-446655440001`]))
        .sql,
    ).toContain(`::uuid[]`);
  });

  it(`renders invalid UUID casts as null UUIDs at raw SQL boundaries`, () => {
    expect(render(sqlUuid(`not-a-uuid`)).sql).toContain(`NULL::uuid`);

    const cursor = render(
      buildDescendingCreatedAtIdCursorSql({
        timestampColumn: Prisma.sql`le.created_at`,
        idColumn: Prisma.sql`le.id`,
        cursor: { createdAt: new Date(`2026-03-02T00:00:00.000Z`), id: `not-a-uuid` },
      }),
    );
    expect(cursor.sql).toContain(`AND FALSE`);
  });

  it(`throws before building required raw UUID casts for command paths`, () => {
    expect(render(sqlRequiredUuid(`  550e8400-e29b-41d4-a716-446655440000  `, `resourceId`)).values).toEqual([
      `550e8400-e29b-41d4-a716-446655440000`,
    ]);
    expect(() => sqlRequiredUuid(`not-a-uuid`, `resourceId`)).toThrow(SqlValidationError);
    expect(() => sqlRequiredUuid(`not-a-uuid`, `resourceId`)).toThrow(`resourceId must be a valid UUID`);
  });

  it(`throws before building required raw UUID arrays with invalid members`, () => {
    expect(render(sqlRequiredUuidArray([`550e8400-e29b-41d4-a716-446655440000`], `resourceIds`)).values).toEqual([
      `550e8400-e29b-41d4-a716-446655440000`,
    ]);
    expect(() => sqlRequiredUuidArray([`550e8400-e29b-41d4-a716-446655440000`, `not-a-uuid`], `resourceIds`)).toThrow(
      SqlValidationError,
    );
    expect(() => sqlRequiredUuidArray([`550e8400-e29b-41d4-a716-446655440000`, `not-a-uuid`], `resourceIds`)).toThrow(
      `resourceIds must be a valid UUID`,
    );
  });

  it(`keeps SQL-looking list values parameterized`, () => {
    const fragment = render(sqlInList([`COMPLETED'); DROP TABLE ledger_entry; --`]));

    expect(fragment.sql).not.toContain(`DROP TABLE`);
    expect(fragment.values).toEqual([`COMPLETED'); DROP TABLE ledger_entry; --`]);
  });

  it(`rejects empty SQL IN lists before rendering invalid SQL`, () => {
    expect(() => sqlInList([])).toThrow(SqlValidationError);
    expect(() => sqlInList([])).toThrow(`sqlInList requires at least one value`);
  });

  it(`validates raw SQL result boundaries`, () => {
    const date = new Date(`2026-03-02T00:00:00.000Z`);

    expect(assertRawUuid(`550e8400-e29b-41d4-a716-446655440000`, `row id`)).toBe(
      `550e8400-e29b-41d4-a716-446655440000`,
    );
    expect(assertRawDate(date, `created_at`)).toBe(date);
    expect(parseRawFiniteNumber({ toString: () => `12.5` }, `balance`)).toBe(12.5);
    expect(() => assertRawUuid(`not-a-uuid`, `row id`)).toThrow(SqlValidationError);
    expect(() => assertRawUuid(`not-a-uuid`, `row id`)).toThrow(`row id must be a valid UUID`);
    expect(() => assertRawDate(`2026-03-02`, `created_at`)).toThrow(SqlValidationError);
    expect(() => assertRawDate(`2026-03-02`, `created_at`)).toThrow(`created_at must be a valid Date`);
    expect(() => parseRawFiniteNumber(`NaN`, `balance`)).toThrow(SqlValidationError);
    expect(() => parseRawFiniteNumber(`NaN`, `balance`)).toThrow(`balance must be a finite number`);
  });

  it(`exposes structured raw SQL validation error codes`, () => {
    for (const [action, code] of [
      [() => assertRawDate(`nope`, `created_at`), `INVALID_SQL_DATE`],
      [() => parseRawFiniteNumber(`NaN`, `balance`), `INVALID_SQL_NUMBER`],
      [() => sqlInList([]), `INVALID_SQL_LIST`],
    ] as const) {
      expect(action).toThrow(expect.objectContaining({ code }));
    }
  });
});
