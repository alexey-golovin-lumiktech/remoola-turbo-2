import { $Enums } from '@remoola/database-2';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';

describe(`AdminPaymentRequestsService payment link scope`, () => {
  it(`routes reversal emails with the stored consumer app scope`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ metadata: { consumerAppScope: `consumer-mobile` } }]),
      },
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const mailingService = {
      sendPaymentRefundEmail: jest.fn().mockResolvedValue(undefined),
      sendPaymentChargebackEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AdminPaymentRequestsService(prisma, mailingService, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 7,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      reason: `admin-reversal`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
        }),
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
  });

  it(`keeps scanning ledger history until a later batch yields the stored consumer app scope`, async () => {
    const createdAt = new Date(`2026-01-01T00:00:00.000Z`);
    const prisma = {
      ledgerEntryModel: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(
            Array.from({ length: 100 }, (_, index) => ({
              id: String(1000 - index).padStart(4, `0`),
              createdAt,
              metadata: {},
            })),
          )
          .mockResolvedValueOnce([{ metadata: { consumerAppScope: `consumer-mobile` } }]),
      },
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const mailingService = {
      sendPaymentRefundEmail: jest.fn().mockResolvedValue(undefined),
      sendPaymentChargebackEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AdminPaymentRequestsService(prisma, mailingService, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 7,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      reason: `admin-reversal`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
          deletedAt: null,
        }),
      }),
    );
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
          deletedAt: null,
          OR: [
            { createdAt: { lt: createdAt } },
            {
              createdAt,
              id: { lt: `0901` },
            },
          ],
        }),
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
  });
});
