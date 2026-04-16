import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentsService } from './admin-v2-payments.service';

describe(`AdminV2PaymentsService`, () => {
  it(`uses latest outcome semantics on payment case instead of earliest outcome`, async () => {
    const service = new AdminV2PaymentsService({
      paymentRequestModel: {
        findUnique: jest.fn(async () => ({
          id: `payment-1`,
          amount: new Prisma.Decimal(`125.50`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: $Enums.PaymentRail.CARD,
          description: `Invoice settlement`,
          dueDate: null,
          sentDate: null,
          createdAt: new Date(`2026-04-08T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-12T00:00:00.000Z`),
          deletedAt: null,
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [],
          ledgerEntries: [
            {
              id: `ledger-1`,
              ledgerId: `ledger-group-1`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              amount: new Prisma.Decimal(`125.50`),
              currencyCode: $Enums.CurrencyCode.USD,
              status: $Enums.TransactionStatus.PENDING,
              createdAt: new Date(`2026-04-08T03:00:00.000Z`),
              deletedAt: null,
              metadata: null,
              outcomes: [
                {
                  id: `outcome-latest`,
                  status: $Enums.TransactionStatus.COMPLETED,
                  source: `stripe`,
                  externalId: `pi_123`,
                  createdAt: new Date(`2026-04-08T05:00:00.000Z`),
                },
                {
                  id: `outcome-earliest`,
                  status: $Enums.TransactionStatus.WAITING,
                  source: `stripe`,
                  externalId: `pi_122`,
                  createdAt: new Date(`2026-04-08T04:00:00.000Z`),
                },
              ],
            },
          ],
        })),
      },
      adminActionAuditLogModel: {
        findMany: jest.fn(async () => []),
      },
    } as never);

    const paymentCase = await service.getPaymentRequestCase(`payment-1`);

    expect(paymentCase.core.persistedStatus).toBe(`PENDING`);
    expect(paymentCase.core.effectiveStatus).toBe(`COMPLETED`);
    expect(paymentCase.staleWarning).toBe(true);
    expect(paymentCase.ledgerEntries).toEqual([
      expect.objectContaining({
        id: `ledger-1`,
        effectiveStatus: `COMPLETED`,
      }),
    ]);
  });

  it(`applies due-date and created-time filters on payment list`, async () => {
    const findMany = jest.fn(async () => []);
    const service = new AdminV2PaymentsService({
      paymentRequestModel: {
        findMany,
      },
    } as never);

    const dueDateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dueDateTo = new Date(`2026-04-30T23:59:59.999Z`);
    const createdFrom = new Date(`2026-03-01T00:00:00.000Z`);
    const createdTo = new Date(`2026-03-31T23:59:59.999Z`);

    await service.listPaymentRequests({
      dueDateFrom,
      dueDateTo,
      createdFrom,
      createdTo,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          dueDate: {
            gte: dueDateFrom,
            lte: dueDateTo,
          },
          createdAt: {
            gte: createdFrom,
            lte: createdTo,
          },
        }),
      }),
    );
  });

  it(`keeps soft-deleted forensic edges on payment case surfaces`, async () => {
    const service = new AdminV2PaymentsService({
      paymentRequestModel: {
        findUnique: jest.fn(async () => ({
          id: `payment-1`,
          amount: new Prisma.Decimal(`125.50`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
          description: `Invoice settlement`,
          dueDate: new Date(`2026-04-10T00:00:00.000Z`),
          sentDate: new Date(`2026-04-09T00:00:00.000Z`),
          createdAt: new Date(`2026-04-08T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-12T00:00:00.000Z`),
          deletedAt: null,
          payer: { id: `consumer-payer`, email: `payer@example.com` },
          requester: { id: `consumer-requester`, email: `requester@example.com` },
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-active`,
              createdAt: new Date(`2026-04-08T01:00:00.000Z`),
              deletedAt: null,
              resource: {
                id: `resource-active`,
                originalName: `invoice.pdf`,
                size: 1024,
                mimetype: `application/pdf`,
                downloadUrl: `https://example.com/invoice.pdf`,
                createdAt: new Date(`2026-04-08T01:00:00.000Z`),
                deletedAt: null,
              },
            },
            {
              id: `attachment-deleted`,
              createdAt: new Date(`2026-04-08T02:00:00.000Z`),
              deletedAt: new Date(`2026-04-13T00:00:00.000Z`),
              resource: {
                id: `resource-deleted`,
                originalName: `chargeback-note.pdf`,
                size: 2048,
                mimetype: `application/pdf`,
                downloadUrl: `https://example.com/chargeback-note.pdf`,
                createdAt: new Date(`2026-04-08T02:00:00.000Z`),
                deletedAt: new Date(`2026-04-13T00:00:00.000Z`),
              },
            },
          ],
          ledgerEntries: [
            {
              id: `ledger-active`,
              ledgerId: `ledger-group-1`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              amount: new Prisma.Decimal(`125.50`),
              currencyCode: $Enums.CurrencyCode.USD,
              status: $Enums.TransactionStatus.PENDING,
              createdAt: new Date(`2026-04-08T03:00:00.000Z`),
              deletedAt: null,
              metadata: null,
              outcomes: [
                {
                  id: `outcome-1`,
                  status: $Enums.TransactionStatus.COMPLETED,
                  source: `stripe`,
                  externalId: `pi_123`,
                  createdAt: new Date(`2026-04-08T04:00:00.000Z`),
                },
              ],
            },
            {
              id: `ledger-deleted`,
              ledgerId: `ledger-group-1`,
              type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
              amount: new Prisma.Decimal(`-125.50`),
              currencyCode: $Enums.CurrencyCode.USD,
              status: $Enums.TransactionStatus.COMPLETED,
              createdAt: new Date(`2026-04-09T03:00:00.000Z`),
              deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
              metadata: null,
              outcomes: [],
            },
          ],
        })),
      },
      adminActionAuditLogModel: {
        findMany: jest.fn(async () => []),
      },
    } as never);

    const paymentCase = await service.getPaymentRequestCase(`payment-1`);

    expect(paymentCase.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `attachment-deleted`,
          deletedAt: new Date(`2026-04-13T00:00:00.000Z`),
          resourceDeletedAt: new Date(`2026-04-13T00:00:00.000Z`),
        }),
      ]),
    );
    expect(paymentCase.ledgerEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `ledger-deleted`,
          deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
        }),
      ]),
    );
    expect(paymentCase.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: `attachment_added`,
          metadata: expect.objectContaining({
            attachmentId: `attachment-deleted`,
            deletedAt: new Date(`2026-04-13T00:00:00.000Z`),
          }),
        }),
        expect.objectContaining({
          event: `ledger_entry_created`,
          metadata: expect.objectContaining({
            ledgerEntryId: `ledger-deleted`,
            deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
          }),
        }),
      ]),
    );
  });
});
