# Schema Types

This folder exposes Prisma schema-derived types from `@remoola/database-2` through `@remoola/api-types`.

## Source Of Truth

- [`packages/database-2/prisma/schema.prisma`](../../../database-2/prisma/schema.prisma) is the only schema source of truth.
- The generated Prisma client in `@remoola/database-2` is the canonical type source used by this folder.
- Run `yarn schema:generate:helpers` after schema changes to regenerate the helper layer.
- Run `yarn schema:check` to validate the full schema-to-types chain locally or in CI.
- Keep `schema:check` out of Vercel install/build commands; use it as a local, pre-merge, or PR gate.

## What is exported

- Raw Prisma-generated type surface via `prisma-generated.ts`
- Generated relation-aware helper types via `models.ts`
- Hand-written scalar aliases via `scalars.ts`

The package root re-exports these as type-only exports, so consumers can import from `@remoola/api-types` directly.

## Vercel Safe Workflow

- Vercel production should only rely on compile-safe steps in this area:
  - `prisma generate`
  - helper generation from the checked-in Prisma schema
  - TypeScript compile
- Do not add `schema:check`, `prisma migrate deploy`, `prisma db push`, or broad multi-app test/typecheck gates to Vercel install/build commands.
- Use `yarn schema:check` before merge or in PR automation to keep strong schema confidence without making production deploys more fragile.

## Recommended usage

Use raw Prisma-generated types when you need exact schema coverage:

```ts
import {
  type ConsumerModel,
  type ConsumerModelCreateInput,
  type ConsumerModelWhereUniqueInput,
  type ConsumerModelSelect,
  type Prisma,
} from '@remoola/api-types';
```

Use relation helper types when you want a common include shape without repeating the Prisma payload definition:

```ts
import {
  type ConsumerModelWithRelations,
  type LedgerEntryModelWithRelations,
  type PaymentRequestModelWithRelations,
} from '@remoola/api-types';
```

Use scalar helpers when you need reusable aliases for Prisma-backed values:

```ts
import {
  type SchemaDateTime,
  type SchemaDecimal,
  type SchemaJsonValue,
  type SerializedSchemaValue,
} from '@remoola/api-types';
```

## Intent

- `prisma-generated.ts` is the source of truth for full schema coverage.
- `models.ts` is a generated convenience layer for common include shapes and composite primary keys.
- `scalars.ts` is a hand-written helper layer for `Date`, `Decimal`, `Json`-like values, and serialization helpers.

If the Prisma schema changes, the generated client in `@remoola/database-2` remains the canonical source.
