import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentsService } from './admin-v2-payments.service';

function buildService() {
  const query = {
    listPaymentRequests: jest.fn(),
    getPaymentRequestCase: jest.fn(),
    getPaymentRequestAuditContext: jest.fn(),
    getPaymentOperationsQueueBuckets: jest.fn(),
  } as any;
  const assignmentsService = {
    getActiveAssigneesForResource: jest.fn(),
    getAssignmentContextForResource: jest.fn(),
  } as any;

  return {
    service: new AdminV2PaymentsService(query, assignmentsService),
    query,
    assignmentsService,
  };
}

describe(`AdminV2PaymentsService`, () => {
  it(`uses latest outcome semantics on payment case instead of earliest outcome`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getPaymentRequestCase.mockResolvedValue({
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
    });
    query.getPaymentRequestAuditContext.mockResolvedValue([]);
    assignmentsService.getAssignmentContextForResource.mockResolvedValue({ current: null, history: [] });

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
    expect(paymentCase.assignment).toEqual({ current: null, history: [] });
  });

  it(`decorates payment request list items with the active assignee`, async () => {
    const { service, query, assignmentsService } = buildService();
    const baseRow = {
      amount: new Prisma.Decimal(`50.00`),
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      paymentRail: null,
      dueDate: null,
      createdAt: new Date(`2026-04-15T00:00:00.000Z`),
      updatedAt: new Date(`2026-04-15T00:00:00.000Z`),
      deletedAt: null,
      payer: null,
      requester: null,
      payerEmail: `payer@example.com`,
      requesterEmail: `requester@example.com`,
      attachments: [],
      ledgerEntries: [],
    } as const;

    query.listPaymentRequests.mockResolvedValue([
      { ...baseRow, id: `pr-A` },
      { ...baseRow, id: `pr-B` },
    ]);
    assignmentsService.getActiveAssigneesForResource.mockResolvedValue(
      new Map([[`pr-A`, { id: `admin-7`, name: null, email: `ops7@example.com` }]]),
    );

    const result = await service.listPaymentRequests();

    expect(query.listPaymentRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        overdue: false,
      }),
    );
    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(
      `payment_request`,
      expect.arrayContaining([`pr-A`, `pr-B`]),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        id: `pr-A`,
        assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
      }),
      expect.objectContaining({
        id: `pr-B`,
        assignedTo: null,
      }),
    ]);
  });

  it(`keeps soft-deleted forensic edges on payment case surfaces`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getPaymentRequestCase.mockResolvedValue({
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
    });
    query.getPaymentRequestAuditContext.mockResolvedValue([]);
    assignmentsService.getAssignmentContextForResource.mockResolvedValue({ current: null, history: [] });

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

  it(`builds payment operations queue buckets without mutating payment semantics`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getPaymentOperationsQueueBuckets.mockResolvedValue({
      overdueRows: [
        {
          id: `payment-overdue`,
          amount: new Prisma.Decimal(`10.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: new Date(`2026-04-01T00:00:00.000Z`),
          createdAt: new Date(`2026-03-20T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-10T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-1`,
              resource: { id: `resource-1`, resourceTags: [{ tag: { name: `INVOICE-WAITING` } }] },
            },
          ],
          ledgerEntries: [],
        },
      ],
      uncollectibleRows: [
        {
          id: `payment-uncollectible`,
          amount: new Prisma.Decimal(`20.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.UNCOLLECTIBLE,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
          dueDate: null,
          createdAt: new Date(`2026-03-21T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-11T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-2`,
              resource: { id: `resource-2`, resourceTags: [{ tag: { name: `INVOICE-UNCOLLECTIBLE` } }] },
            },
          ],
          ledgerEntries: [],
        },
      ],
      staleApprovalRows: [
        {
          id: `payment-stale-approval`,
          amount: new Prisma.Decimal(`25.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: null,
          createdAt: new Date(`2000-01-01T00:00:00.000Z`),
          updatedAt: new Date(`2000-01-02T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-stale-approval`,
              resource: { id: `resource-stale-approval`, resourceTags: [{ tag: { name: `INVOICE-PENDING` } }] },
            },
          ],
          ledgerEntries: [],
        },
      ],
      inconsistentRows: [
        {
          id: `payment-stale`,
          amount: new Prisma.Decimal(`30.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: null,
          createdAt: new Date(`2026-03-22T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-12T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-3`,
              resource: { id: `resource-3`, resourceTags: [{ tag: { name: `INVOICE-PENDING` } }] },
            },
          ],
          ledgerEntries: [
            {
              id: `ledger-3`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.PENDING,
              createdAt: new Date(`2026-04-12T00:00:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        },
      ],
      missingAttachmentRows: [
        {
          id: `payment-missing-attachment`,
          amount: new Prisma.Decimal(`40.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: null,
          createdAt: new Date(`2026-03-23T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-13T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [],
          ledgerEntries: [],
        },
        {
          id: `payment-missing-invoice-link`,
          amount: new Prisma.Decimal(`50.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: null,
          createdAt: new Date(`2026-03-24T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-14T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [{ id: `attachment-5`, resource: { id: `resource-5`, resourceTags: [] } }],
          ledgerEntries: [],
        },
      ],
    });
    assignmentsService.getActiveAssigneesForResource.mockResolvedValue(new Map());

    const queue = await service.getPaymentOperationsQueue();

    expect(queue.posture.kind).toBe(`non_sla_follow_up_queue`);
    expect(queue.buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: `overdue_requests`,
          items: [expect.objectContaining({ id: `payment-overdue` })],
        }),
        expect.objectContaining({
          key: `uncollectible_requests`,
          items: [expect.objectContaining({ id: `payment-uncollectible` })],
        }),
        expect.objectContaining({
          key: `stale_waiting_recipient_approval`,
          items: [
            expect.objectContaining({
              id: `payment-stale-approval`,
              persistedStatus: `WAITING_RECIPIENT_APPROVAL`,
            }),
          ],
        }),
        expect.objectContaining({
          key: `inconsistent_status`,
          items: [expect.objectContaining({ id: `payment-stale`, staleWarning: true })],
        }),
        expect.objectContaining({
          key: `missing_attachment_or_invoice_linkage`,
          items: expect.arrayContaining([
            expect.objectContaining({ id: `payment-missing-attachment`, attachmentsCount: 0 }),
            expect.objectContaining({ id: `payment-missing-invoice-link`, invoiceTaggedAttachmentsCount: 0 }),
          ]),
        }),
      ]),
    );
  });

  it(`decorates payment operations queue items with active assignee`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getPaymentOperationsQueueBuckets.mockResolvedValue({
      overdueRows: [
        {
          id: `payment-A`,
          amount: new Prisma.Decimal(`10.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: new Date(`2026-04-01T00:00:00.000Z`),
          createdAt: new Date(`2026-03-20T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-10T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-A`,
              resource: { id: `resource-A`, resourceTags: [{ tag: { name: `INVOICE-WAITING` } }] },
            },
          ],
          ledgerEntries: [],
        },
      ],
      uncollectibleRows: [],
      staleApprovalRows: [
        {
          id: `payment-B`,
          amount: new Prisma.Decimal(`25.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
          paymentRail: $Enums.PaymentRail.CARD,
          dueDate: null,
          createdAt: new Date(`2000-01-01T00:00:00.000Z`),
          updatedAt: new Date(`2000-01-02T00:00:00.000Z`),
          payer: null,
          requester: null,
          payerEmail: `payer@example.com`,
          requesterEmail: `requester@example.com`,
          attachments: [
            {
              id: `attachment-B`,
              resource: { id: `resource-B`, resourceTags: [{ tag: { name: `INVOICE-PENDING` } }] },
            },
          ],
          ledgerEntries: [],
        },
      ],
      inconsistentRows: [],
      missingAttachmentRows: [],
    });
    assignmentsService.getActiveAssigneesForResource.mockResolvedValue(
      new Map([[`payment-A`, { id: `admin-7`, name: null, email: `ops7@example.com` }]]),
    );

    const queue = await service.getPaymentOperationsQueue();

    const overdueBucket = queue.buckets.find((bucket) => bucket.key === `overdue_requests`);
    const staleApprovalBucket = queue.buckets.find((bucket) => bucket.key === `stale_waiting_recipient_approval`);

    expect(overdueBucket?.items[0]).toEqual(
      expect.objectContaining({
        id: `payment-A`,
        assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
      }),
    );
    expect(staleApprovalBucket?.items[0]).toEqual(expect.objectContaining({ id: `payment-B`, assignedTo: null }));
    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(
      `payment_request`,
      expect.arrayContaining([`payment-A`, `payment-B`]),
    );
  });

  it(`exposes payment_request assignment context on getPaymentRequestCase`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getPaymentRequestCase.mockResolvedValue({
      id: `payment-1`,
      amount: new Prisma.Decimal(`125.50`),
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      paymentRail: $Enums.PaymentRail.CARD,
      description: null,
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
      ledgerEntries: [],
    });
    query.getPaymentRequestAuditContext.mockResolvedValue([]);
    assignmentsService.getAssignmentContextForResource.mockResolvedValue({
      current: {
        id: `assignment-active`,
        assignedTo: { id: `admin-7`, name: null, email: `ops@example.com` },
        assignedBy: { id: `admin-7`, name: null, email: `ops@example.com` },
        assignedAt: `2026-04-21T08:00:00.000Z`,
        reason: `Investigating discrepancy`,
        expiresAt: null,
      },
      history: [
        {
          id: `assignment-active`,
          assignedTo: { id: `admin-7`, name: null, email: `ops@example.com` },
          assignedBy: { id: `admin-7`, name: null, email: `ops@example.com` },
          assignedAt: `2026-04-21T08:00:00.000Z`,
          releasedAt: null,
          releasedBy: null,
          reason: `Investigating discrepancy`,
          expiresAt: null,
        },
      ],
    });

    const paymentCase = await service.getPaymentRequestCase(`payment-1`);

    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`payment_request`, `payment-1`);
    expect(paymentCase.assignment.current).toEqual(
      expect.objectContaining({
        id: `assignment-active`,
        assignedTo: expect.objectContaining({ id: `admin-7`, email: `ops@example.com` }),
        reason: `Investigating discrepancy`,
      }),
    );
    expect(paymentCase.assignment.history).toHaveLength(1);
  });
});
