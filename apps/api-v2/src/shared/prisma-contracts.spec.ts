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

      const row = await prisma.stripeWebhookEventModel.findUnique({ where: { eventId } });
      expect(row).toEqual(
        expect.objectContaining({
          eventId,
          status: `PROCESSED`,
          attemptCount: 0,
        }),
      );
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

    it(`accepts processing lifecycle fields`, async () => {
      const processingEventId = `evt_db_processing_${Date.now()}`;
      const now = new Date();

      const row = await prisma.stripeWebhookEventModel.create({
        data: {
          eventId: processingEventId,
          eventType: `charge.refunded`,
          status: `PROCESSING`,
          claimToken: `claim-token-contract`,
          processingStartedAt: now,
          attemptCount: 1,
        },
      });

      expect(row).toEqual(
        expect.objectContaining({
          eventId: processingEventId,
          eventType: `charge.refunded`,
          status: `PROCESSING`,
          claimToken: `claim-token-contract`,
          attemptCount: 1,
        }),
      );
    });

    it(`rejects unsupported webhook lifecycle status`, async () => {
      await expect(
        prisma.stripeWebhookEventModel.create({
          data: {
            eventId: `evt_db_bad_status_${Date.now()}`,
            status: `RETRYING`,
          },
        }),
      ).rejects.toThrow();
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
