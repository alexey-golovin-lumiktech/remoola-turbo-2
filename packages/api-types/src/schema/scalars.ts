import type { Prisma } from '@remoola/database-2';

/**
 * Shared scalar aliases for schema-derived Prisma types.
 * These stay type-only so api-types does not pull Prisma runtime into web bundles.
 */

export type SchemaUuid = string;
export type SchemaDateTime = Date;
export type SchemaDecimal = Prisma.Decimal;
export type SchemaJsonValue = Prisma.JsonValue;
export type SchemaJsonObject = Prisma.JsonObject;
export type SchemaJsonArray = Prisma.JsonArray;
export type SchemaNullableJsonValue = SchemaJsonValue | null;

type SchemaPrimitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Utility for API-safe serialized shapes when a caller needs JSON/wire representations
 * of Prisma-backed records.
 */
export type SerializedSchemaValue<T> =
  T extends Prisma.Decimal ? string
  : T extends Date ? string
  : T extends SchemaPrimitive ? T
  : T extends Array<infer TItem> ? SerializedSchemaValue<TItem>[]
  : T extends ReadonlyArray<infer TItem> ? readonly SerializedSchemaValue<TItem>[]
  : T extends object ? { [K in keyof T]: SerializedSchemaValue<T[K]> }
  : T;
