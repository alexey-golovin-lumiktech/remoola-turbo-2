import { Prisma } from '@remoola/database-2';

import { StripeWebhookDeduplicationRepository } from './stripe-webhook-deduplication.repository';
import { type PrismaService } from '../../../../../shared/prisma.service';

describe(`StripeWebhookDeduplicationRepository`, () => {
  function makeRepository() {
    const prisma = {
      stripeWebhookEventModel: {
        findUnique: jest.fn(async (_args: unknown) => null),
        create: jest.fn(async (_args: unknown) => null),
        updateMany: jest.fn(async (_args: unknown) => ({ count: 0 })),
      },
    };
    return {
      prisma,
      repository: new StripeWebhookDeduplicationRepository(prisma as unknown as PrismaService),
    };
  }

  function makeP2002Error() {
    return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed`, {
      code: `P2002`,
      clientVersion: `test`,
    });
  }

  describe(`findStatus`, () => {
    it(`returns eventId and status by primary key`, async () => {
      const { prisma, repository } = makeRepository();
      await repository.findStatus(`evt_1`);
      expect(prisma.stripeWebhookEventModel.findUnique).toHaveBeenCalledWith({
        where: { eventId: `evt_1` },
        select: { eventId: true, status: true },
      });
    });
  });

  describe(`tryCreateProcessingClaim`, () => {
    const params = {
      eventId: `evt_1`,
      eventType: `charge.succeeded`,
      claimToken: `token-abc`,
      now: new Date(`2026-01-01T00:00:00.000Z`),
      status: `PROCESSING`,
    };

    it(`creates a fresh row with attemptCount 1 and reports created`, async () => {
      const { prisma, repository } = makeRepository();
      await expect(repository.tryCreateProcessingClaim(params)).resolves.toBe(`created`);
      expect(prisma.stripeWebhookEventModel.create).toHaveBeenCalledWith({
        data: {
          eventId: `evt_1`,
          eventType: `charge.succeeded`,
          status: `PROCESSING`,
          claimToken: `token-abc`,
          processingStartedAt: params.now,
          attemptCount: 1,
        },
      });
    });

    it(`maps P2002 unique-constraint failures to "duplicate"`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.create.mockRejectedValueOnce(makeP2002Error());
      await expect(repository.tryCreateProcessingClaim(params)).resolves.toBe(`duplicate`);
    });

    it(`rethrows non-P2002 errors`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.create.mockRejectedValueOnce(new Error(`boom`));
      await expect(repository.tryCreateProcessingClaim(params)).rejects.toThrow(`boom`);
    });
  });

  describe(`findProcessingState`, () => {
    it(`returns status and processingStartedAt for the given eventId`, async () => {
      const { prisma, repository } = makeRepository();
      await repository.findProcessingState(`evt_1`);
      expect(prisma.stripeWebhookEventModel.findUnique).toHaveBeenCalledWith({
        where: { eventId: `evt_1` },
        select: { status: true, processingStartedAt: true },
      });
    });
  });

  describe(`tryReclaimProcessingClaim`, () => {
    const baseParams = {
      eventId: `evt_1`,
      eventType: `charge.succeeded`,
      claimToken: `token-new`,
      now: new Date(`2026-01-01T00:00:00.000Z`),
      status: `PROCESSING`,
      failedStatus: `FAILED`,
      staleCutoff: new Date(`2025-12-31T23:00:00.000Z`),
    };

    it(`returns true exactly when a single row was reclaimed`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.updateMany.mockResolvedValueOnce({ count: 1 });
      await expect(repository.tryReclaimProcessingClaim(baseParams)).resolves.toBe(true);

      const args = prisma.stripeWebhookEventModel.updateMany.mock.calls[0]?.[0] as {
        where: { eventId: string; OR: Array<Record<string, unknown>> };
        data: { attemptCount: { increment: number }; claimToken: string };
      };
      expect(args.where.eventId).toBe(`evt_1`);
      expect(args.where.OR).toEqual([
        { status: `FAILED` },
        { status: `PROCESSING`, processingStartedAt: { lte: baseParams.staleCutoff } },
      ]);
      expect(args.data.attemptCount).toEqual({ increment: 1 });
      expect(args.data.claimToken).toBe(`token-new`);
    });

    it(`returns false when no row matched the reclaim conditions`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(repository.tryReclaimProcessingClaim(baseParams)).resolves.toBe(false);
    });
  });

  describe(`markProcessed`, () => {
    it(`narrows the update to the matching claim token and clears error metadata`, async () => {
      const { prisma, repository } = makeRepository();
      const now = new Date(`2026-01-01T00:00:00.000Z`);
      await repository.markProcessed({
        eventId: `evt_1`,
        claimToken: `token-abc`,
        processingStatus: `PROCESSING`,
        processedStatus: `PROCESSED`,
        now,
      });
      expect(prisma.stripeWebhookEventModel.updateMany).toHaveBeenCalledWith({
        where: { eventId: `evt_1`, status: `PROCESSING`, claimToken: `token-abc` },
        data: {
          status: `PROCESSED`,
          processedAt: now,
          failedAt: null,
          lastErrorClass: null,
          lastErrorMessage: null,
        },
      });
    });
  });

  describe(`markFailed`, () => {
    it(`narrows the update to the matching claim token and records error details`, async () => {
      const { prisma, repository } = makeRepository();
      const now = new Date(`2026-01-01T00:00:00.000Z`);
      await repository.markFailed({
        eventId: `evt_1`,
        claimToken: `token-abc`,
        processingStatus: `PROCESSING`,
        failedStatus: `FAILED`,
        now,
        errorClass: `TypeError`,
        errorMessage: `bad payload`,
      });
      expect(prisma.stripeWebhookEventModel.updateMany).toHaveBeenCalledWith({
        where: { eventId: `evt_1`, status: `PROCESSING`, claimToken: `token-abc` },
        data: {
          status: `FAILED`,
          failedAt: now,
          lastErrorClass: `TypeError`,
          lastErrorMessage: `bad payload`,
        },
      });
    });
  });

  describe(`tryRecordProcessed`, () => {
    const now = new Date(`2026-01-01T00:00:00.000Z`);

    it(`creates a terminal row with attemptCount 1 and reports created`, async () => {
      const { prisma, repository } = makeRepository();
      await expect(repository.tryRecordProcessed(`evt_1`, `PROCESSED`, now)).resolves.toBe(`created`);
      expect(prisma.stripeWebhookEventModel.create).toHaveBeenCalledWith({
        data: {
          eventId: `evt_1`,
          status: `PROCESSED`,
          processedAt: now,
          attemptCount: 1,
        },
      });
    });

    it(`maps P2002 unique-constraint failures to "duplicate"`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.create.mockRejectedValueOnce(makeP2002Error());
      await expect(repository.tryRecordProcessed(`evt_1`, `PROCESSED`, now)).resolves.toBe(`duplicate`);
    });

    it(`rethrows non-P2002 errors`, async () => {
      const { prisma, repository } = makeRepository();
      prisma.stripeWebhookEventModel.create.mockRejectedValueOnce(new Error(`boom`));
      await expect(repository.tryRecordProcessed(`evt_1`, `PROCESSED`, now)).rejects.toThrow(`boom`);
    });
  });
});
