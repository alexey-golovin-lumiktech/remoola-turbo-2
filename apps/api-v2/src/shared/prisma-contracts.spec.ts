/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { createPrismaTestContext } from '../../test/helpers/prisma-test-context';

describe(`Prisma database contracts`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;

  beforeAll(async () => {
    await prismaContext.connect();
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  describe(`stripe webhook event dedup`, () => {
    const eventId = `evt_db_contract_${Date.now()}`;

    it(`inserts the first event_id successfully`, async () => {
      await prisma.stripeWebhookEventModel.create({
        data: { eventId },
      });

      const count = await prisma.stripeWebhookEventModel.count({ where: { eventId } });
      expect(count).toBe(1);
    });

    it(`rejects a duplicate event_id with Prisma P2002`, async () => {
      await expect(
        prisma.stripeWebhookEventModel.create({
          data: { eventId },
        }),
      ).rejects.toMatchObject({
        code: `P2002`,
        meta: expect.objectContaining({ target: [`event_id`] }),
      });
    });
  });

  describe(`ledger entry outcome append-only contract`, () => {
    it(`accepts an outcome row for an existing ledger entry`, async () => {
      const entry = await prisma.ledgerEntryModel.findFirst({
        select: { id: true },
      });

      expect(entry).toBeDefined();
      if (!entry) return;

      const outcome = await prisma.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.COMPLETED,
          source: `db-contract-test`,
          externalId: `db-contract-ext-${Date.now()}`,
        },
      });

      expect(outcome).toEqual(
        expect.objectContaining({
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.COMPLETED,
          source: `db-contract-test`,
        }),
      );
    });
  });
});
