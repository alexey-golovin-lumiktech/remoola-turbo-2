import { type Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

/** Client that has ledgerEntryOutcomeModel (PrismaService or transaction client). */
type LedgerOutcomeClient = {
  ledgerEntryOutcomeModel: {
    create: (args: { data: Prisma.LedgerEntryOutcomeModelCreateInput }) => Promise<unknown>;
  };
};

/** Convenience input: use ledgerEntryId; helper maps to Prisma relation form. */
export type CreateOutcomeIdempotentData = {
  ledgerEntryId: string;
  status: Prisma.LedgerEntryOutcomeModelCreateInput[`status`];
  source?: string | null;
  externalId?: string | null;
};

/**
 * Creates a ledger entry outcome. On unique constraint violation (P2002) for
 * (ledger_entry_id, external_id), treats as already-processed and returns without throwing.
 * Use when externalId is set; requires DB unique index on (ledger_entry_id, external_id).
 */
export async function createOutcomeIdempotent(
  client: LedgerOutcomeClient,
  data: CreateOutcomeIdempotentData,
  logger?: Logger,
): Promise<void> {
  const createInput: Prisma.LedgerEntryOutcomeModelCreateInput = {
    ledgerEntry: { connect: { id: data.ledgerEntryId } },
    status: data.status,
    source: data.source ?? undefined,
    externalId: data.externalId ?? undefined,
  };
  try {
    await client.ledgerEntryOutcomeModel.create({ data: createInput });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
      logger?.debug?.(`Ledger outcome already recorded (idempotent skip)`);
      return;
    }
    throw err;
  }
}
