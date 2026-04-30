import { Prisma } from '@remoola/database-2';

/**
 * Raw SQL guidance for Prisma + PostgreSQL in this codebase:
 * - Use tagged templates / `Prisma.sql` for values so Prisma parameterizes them safely.
 * - For UUID arrays, prefer `ANY(${ids}::uuid[])` over `IN (${Prisma.join(ids)})` to avoid text-vs-uuid mismatches.
 * - Reserve `$executeRawUnsafe` for trusted DDL/identifier cases only, after explicit whitelisting and quoting.
 *
 * The shared consumer balance lock intentionally keeps the legacy `:outgoing` suffix so mixed-version
 * deployments still serialize spendable-balance mutations across withdraw / transfer / reversal flows.
 */
export function buildConsumerOutgoingBalanceLockName(consumerId: string): string {
  return `${consumerId}:outgoing`;
}

export function buildConsumerOperationLockName(consumerId: string, operation: string): string {
  return `${consumerId}:${operation}`;
}

export function buildPaymentRequestOperationLockName(paymentRequestId: string, operation: string): string {
  return `${paymentRequestId}:${operation}`;
}

export async function acquireTransactionAdvisoryLock(
  tx: Pick<Prisma.TransactionClient, `$executeRaw`>,
  lockName: string,
): Promise<void> {
  await tx.$executeRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(hashtext(${lockName}::text)::bigint)
  `);
}
