import { describe, expect, it } from '@jest/globals';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentsPresenter } from './admin-v2-payments.presenter';

type PaymentStatusInput = Parameters<AdminV2PaymentsPresenter[`getEffectivePaymentStatus`]>[0];
type PaymentRailInput = Parameters<AdminV2PaymentsPresenter[`derivePaymentRail`]>[0];
type PaymentListRow = Parameters<AdminV2PaymentsPresenter[`mapPaymentListItem`]>[0];
type PaymentRequestCaseRow = Parameters<AdminV2PaymentsPresenter[`mapPaymentRequestCase`]>[0];
type PaymentAuditContextRow = Parameters<AdminV2PaymentsPresenter[`mapPaymentRequestCase`]>[1][number];
type PaymentAssignmentContext = Parameters<AdminV2PaymentsPresenter[`mapPaymentRequestCase`]>[2];
type PaymentQueueRow = Parameters<AdminV2PaymentsPresenter[`mapPaymentOperationsQueueItem`]>[0];
type QueueAssignee = Exclude<Parameters<AdminV2PaymentsPresenter[`mapPaymentOperationsQueueItem`]>[1], null>;

function buildPresenter() {
  return new AdminV2PaymentsPresenter();
}

function buildOutcome(
  overrides: Partial<{
    id: string;
    status: $Enums.TransactionStatus;
    source: string;
    externalId: string;
    createdAt: Date;
  }> = {},
) {
  return {
    id: `outcome-1`,
    status: $Enums.TransactionStatus.COMPLETED,
    source: `stripe`,
    externalId: `pi_123`,
    createdAt: new Date(`2026-04-08T04:00:00.000Z`),
    ...overrides,
  };
}

function buildSettlementEntry(
  overrides: Partial<{
    id: string;
    ledgerId: string;
    type: $Enums.LedgerEntryType;
    amount: Prisma.Decimal;
    currencyCode: $Enums.CurrencyCode;
    status: $Enums.TransactionStatus;
    createdAt: Date;
    deletedAt: Date | null;
    metadata: Prisma.JsonValue | null;
    outcomes: Array<ReturnType<typeof buildOutcome>>;
  }> = {},
) {
  return {
    id: `ledger-1`,
    ledgerId: `ledger-group-1`,
    type: $Enums.LedgerEntryType.USER_PAYMENT,
    amount: new Prisma.Decimal(`125.50`),
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.PENDING,
    createdAt: new Date(`2026-04-08T03:00:00.000Z`),
    deletedAt: null,
    metadata: null,
    outcomes: [buildOutcome()],
    ...overrides,
  };
}

function buildListRow(overrides: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    id: `payment-list-1`,
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
    ...overrides,
  };
}

function buildCaseRow(overrides: Partial<PaymentRequestCaseRow> = {}): PaymentRequestCaseRow {
  return {
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
      buildSettlementEntry(),
      buildSettlementEntry({
        id: `ledger-deleted`,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
        amount: new Prisma.Decimal(`-125.50`),
        status: $Enums.TransactionStatus.COMPLETED,
        createdAt: new Date(`2026-04-09T03:00:00.000Z`),
        deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
        outcomes: [],
      }),
    ],
    ...overrides,
  };
}

function buildQueueRow(overrides: Partial<PaymentQueueRow> = {}): PaymentQueueRow {
  return {
    id: `payment-queue-1`,
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
    ...overrides,
  };
}

function buildAuditContextRow(overrides: Partial<PaymentAuditContextRow> = {}): PaymentAuditContextRow {
  return {
    id: `audit-1`,
    action: `payment_request_reviewed`,
    resource: `payment_request`,
    resourceId: `payment-1`,
    admin: { email: `admin@example.com` },
    createdAt: new Date(`2026-04-12T08:00:00.000Z`),
    ...overrides,
  } as PaymentAuditContextRow;
}

function buildAssignmentContext(overrides: Partial<PaymentAssignmentContext> = {}): PaymentAssignmentContext {
  return {
    current: null,
    history: [],
    ...overrides,
  };
}

function buildAssignee(overrides: Partial<QueueAssignee> = {}): QueueAssignee {
  return {
    id: `admin-7`,
    name: null,
    email: `ops@example.com`,
    ...overrides,
  };
}

describe(`AdminV2PaymentsPresenter`, () => {
  describe(`getEffectivePaymentStatus`, () => {
    it(`returns null for nullish inputs`, () => {
      const presenter = buildPresenter();

      expect(presenter.getEffectivePaymentStatus(null)).toBeNull();
      expect(presenter.getEffectivePaymentStatus(undefined)).toBeNull();
    });

    it(`uses the latest settlement entry by createdAt and ignores non-settlement entries`, () => {
      const presenter = buildPresenter();
      const paymentRequest: PaymentStatusInput = {
        status: $Enums.TransactionStatus.PENDING,
        ledgerEntries: [
          {
            status: $Enums.TransactionStatus.DENIED,
            createdAt: new Date(`2026-04-08T06:00:00.000Z`),
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            outcomes: [{ status: $Enums.TransactionStatus.DENIED }],
          },
          {
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-04-08T03:00:00.000Z`),
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
          },
          {
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-04-08T05:00:00.000Z`),
            type: $Enums.LedgerEntryType.USER_DEPOSIT,
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ],
      };

      expect(presenter.getEffectivePaymentStatus(paymentRequest)).toBe($Enums.TransactionStatus.COMPLETED);
    });

    it(`falls back to the persisted payment status when no settlement entries exist`, () => {
      const presenter = buildPresenter();
      const paymentRequest: PaymentStatusInput = {
        status: $Enums.TransactionStatus.UNCOLLECTIBLE,
        ledgerEntries: [
          {
            status: $Enums.TransactionStatus.COMPLETED,
            createdAt: new Date(`2026-04-08T06:00:00.000Z`),
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ],
      };

      expect(presenter.getEffectivePaymentStatus(paymentRequest)).toBe($Enums.TransactionStatus.UNCOLLECTIBLE);
    });
  });

  describe(`derivePaymentRail`, () => {
    it(`returns null for nullish inputs`, () => {
      const presenter = buildPresenter();

      expect(presenter.derivePaymentRail(null)).toBeNull();
      expect(presenter.derivePaymentRail(undefined)).toBeNull();
    });

    it(`prefers the top-level payment rail over ledger metadata`, () => {
      const presenter = buildPresenter();
      const paymentRequest: PaymentRailInput = {
        paymentRail: $Enums.PaymentRail.CARD,
        ledgerEntries: [
          {
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
          },
        ],
      };

      expect(presenter.derivePaymentRail(paymentRequest)).toBe($Enums.PaymentRail.CARD);
    });

    it(`falls back to the first ledger metadata rail and returns null when none exists`, () => {
      const presenter = buildPresenter();

      expect(
        presenter.derivePaymentRail({
          paymentRail: null,
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: { ignored: true },
            },
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
            },
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: { rail: $Enums.PaymentRail.CARD },
            },
          ],
        }),
      ).toBe($Enums.PaymentRail.BANK_TRANSFER);

      expect(
        presenter.derivePaymentRail({
          paymentRail: null,
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: { ignored: true },
            },
          ],
        }),
      ).toBeNull();
    });
  });

  describe(`mapPaymentListItem`, () => {
    it(`computes staleWarning exactly from effective vs persisted status`, () => {
      const presenter = buildPresenter();

      expect(
        presenter.mapPaymentListItem(
          buildListRow({
            status: $Enums.TransactionStatus.PENDING,
            ledgerEntries: [
              {
                id: `ledger-stale`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-04-12T00:00:00.000Z`),
                metadata: null,
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          }),
        ).staleWarning,
      ).toBe(true);

      expect(
        presenter.mapPaymentListItem(
          buildListRow({
            status: $Enums.TransactionStatus.PENDING,
            ledgerEntries: [
              {
                id: `ledger-fresh`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-04-12T00:00:00.000Z`),
                metadata: null,
                outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
              },
            ],
          }),
        ).staleWarning,
      ).toBe(false);
    });
  });

  describe(`mapPaymentRequestCase`, () => {
    it(`preserves stale warning semantics, payment rail, and audit metadata`, () => {
      const presenter = buildPresenter();
      const paymentCase = presenter.mapPaymentRequestCase(
        buildCaseRow({
          paymentRail: null,
          ledgerEntries: [
            buildSettlementEntry({
              metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
              outcomes: [buildOutcome({ status: $Enums.TransactionStatus.COMPLETED })],
            }),
          ],
        }),
        [buildAuditContextRow()],
        buildAssignmentContext(),
      );

      expect(paymentCase.core.effectiveStatus).toBe($Enums.TransactionStatus.COMPLETED);
      expect(paymentCase.core.paymentRail).toBe($Enums.PaymentRail.BANK_TRANSFER);
      expect(paymentCase.staleWarning).toBe(true);
      expect(paymentCase.auditContext).toEqual([
        {
          id: `audit-1`,
          action: `payment_request_reviewed`,
          resource: `payment_request`,
          resourceId: `payment-1`,
          adminEmail: `admin@example.com`,
          createdAt: new Date(`2026-04-12T08:00:00.000Z`),
        },
      ]);
    });

    it(`returns a globally time-ordered forensic timeline and preserves deleted edges`, () => {
      const presenter = buildPresenter();
      const paymentCase = presenter.mapPaymentRequestCase(
        buildCaseRow({
          attachments: [
            {
              id: `attachment-late`,
              createdAt: new Date(`2026-04-08T05:30:00.000Z`),
              deletedAt: new Date(`2026-04-15T00:00:00.000Z`),
              resource: {
                id: `resource-late`,
                originalName: `late-invoice.pdf`,
                size: 512,
                mimetype: `application/pdf`,
                downloadUrl: `https://example.com/late-invoice.pdf`,
                createdAt: new Date(`2026-04-08T05:30:00.000Z`),
                deletedAt: new Date(`2026-04-15T00:00:00.000Z`),
              },
            },
            {
              id: `attachment-early`,
              createdAt: new Date(`2026-04-08T00:30:00.000Z`),
              deletedAt: null,
              resource: {
                id: `resource-early`,
                originalName: `early-note.pdf`,
                size: 256,
                mimetype: `application/pdf`,
                downloadUrl: `https://example.com/early-note.pdf`,
                createdAt: new Date(`2026-04-08T00:30:00.000Z`),
                deletedAt: null,
              },
            },
          ],
          ledgerEntries: [
            buildSettlementEntry({
              id: `ledger-late`,
              createdAt: new Date(`2026-04-08T06:00:00.000Z`),
              outcomes: [buildOutcome({ id: `outcome-late`, createdAt: new Date(`2026-04-08T06:15:00.000Z`) })],
            }),
            buildSettlementEntry({
              id: `ledger-early`,
              ledgerId: `ledger-group-2`,
              createdAt: new Date(`2026-04-08T02:00:00.000Z`),
              deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
              outcomes: [buildOutcome({ id: `outcome-early`, createdAt: new Date(`2026-04-08T02:30:00.000Z`) })],
            }),
          ],
        }),
        [],
        buildAssignmentContext(),
      );

      expect(paymentCase.timeline.map((item) => item.event)).toEqual([
        `payment_request_created`,
        `attachment_added`,
        `ledger_entry_created`,
        `ledger_outcome_recorded`,
        `attachment_added`,
        `ledger_entry_created`,
        `ledger_outcome_recorded`,
        `payment_request_sent`,
        `payment_request_due`,
      ]);
      expect(paymentCase.timeline.map((item) => item.timestamp.toISOString())).toEqual([
        `2026-04-08T00:00:00.000Z`,
        `2026-04-08T00:30:00.000Z`,
        `2026-04-08T02:00:00.000Z`,
        `2026-04-08T02:30:00.000Z`,
        `2026-04-08T05:30:00.000Z`,
        `2026-04-08T06:00:00.000Z`,
        `2026-04-08T06:15:00.000Z`,
        `2026-04-09T00:00:00.000Z`,
        `2026-04-10T00:00:00.000Z`,
      ]);
      expect(paymentCase.timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: `attachment_added`,
            metadata: expect.objectContaining({
              attachmentId: `attachment-late`,
              deletedAt: new Date(`2026-04-15T00:00:00.000Z`),
              resourceDeletedAt: new Date(`2026-04-15T00:00:00.000Z`),
            }),
          }),
          expect.objectContaining({
            event: `ledger_entry_created`,
            metadata: expect.objectContaining({
              ledgerEntryId: `ledger-early`,
              deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
            }),
          }),
        ]),
      );
      expect(paymentCase.version).toBe(paymentCase.updatedAt.getTime());
    });

    it(`passes through assignment context and preserves exact dataFreshnessClass`, () => {
      const presenter = buildPresenter();
      const assignment = buildAssignmentContext({
        current: {
          id: `assignment-active`,
          assignedTo: { id: `admin-7`, name: null, email: `ops@example.com` },
          assignedBy: { id: `admin-9`, name: `Lead`, email: `lead@example.com` },
          assignedAt: `2026-04-21T08:00:00.000Z`,
          reason: `Investigating discrepancy`,
          expiresAt: null,
        },
        history: [
          {
            id: `assignment-active`,
            assignedTo: { id: `admin-7`, name: null, email: `ops@example.com` },
            assignedBy: { id: `admin-9`, name: `Lead`, email: `lead@example.com` },
            assignedAt: `2026-04-21T08:00:00.000Z`,
            releasedAt: null,
            releasedBy: null,
            reason: `Investigating discrepancy`,
            expiresAt: null,
          },
        ],
      });

      const paymentCase = presenter.mapPaymentRequestCase(buildCaseRow(), [], assignment);
      const unassignedPaymentCase = presenter.mapPaymentRequestCase(buildCaseRow(), [], buildAssignmentContext());

      expect(paymentCase.assignment).toEqual(assignment);
      expect(paymentCase.assignment.current).toEqual(assignment.current);
      expect(paymentCase.assignment.history).toEqual(assignment.history);
      expect(paymentCase.dataFreshnessClass).toBe(`exact`);
      expect(unassignedPaymentCase.assignment.current).toBeNull();
      expect(unassignedPaymentCase.assignment.history).toEqual([]);
      expect(unassignedPaymentCase.dataFreshnessClass).toBe(`exact`);
    });

    it(`returns staleWarning false when effective status matches persisted status`, () => {
      const presenter = buildPresenter();
      const paymentCase = presenter.mapPaymentRequestCase(
        buildCaseRow({
          paymentRail: $Enums.PaymentRail.CARD,
          ledgerEntries: [
            buildSettlementEntry({
              status: $Enums.TransactionStatus.PENDING,
              outcomes: [buildOutcome({ status: $Enums.TransactionStatus.PENDING })],
            }),
          ],
        }),
        [],
        buildAssignmentContext(),
      );

      expect(paymentCase.core.persistedStatus).toBe($Enums.TransactionStatus.PENDING);
      expect(paymentCase.core.effectiveStatus).toBe($Enums.TransactionStatus.PENDING);
      expect(paymentCase.core.effectiveStatus).toBe(paymentCase.core.persistedStatus);
      expect(paymentCase.staleWarning).toBe(false);
    });

    it(`maps forensic attachments with exact output shape and preserves deleted metadata`, () => {
      const presenter = buildPresenter();
      const paymentRequest = buildCaseRow();
      const paymentCase = presenter.mapPaymentRequestCase(paymentRequest, [], buildAssignmentContext());

      expect(paymentCase.attachments).toEqual([
        {
          id: paymentRequest.attachments[0].id,
          resourceId: paymentRequest.attachments[0].resource.id,
          name: paymentRequest.attachments[0].resource.originalName,
          size: paymentRequest.attachments[0].resource.size,
          mimetype: paymentRequest.attachments[0].resource.mimetype,
          downloadUrl: paymentRequest.attachments[0].resource.downloadUrl,
          createdAt: paymentRequest.attachments[0].resource.createdAt,
          deletedAt: paymentRequest.attachments[0].deletedAt,
          resourceDeletedAt: paymentRequest.attachments[0].resource.deletedAt,
        },
        {
          id: paymentRequest.attachments[1].id,
          resourceId: paymentRequest.attachments[1].resource.id,
          name: paymentRequest.attachments[1].resource.originalName,
          size: paymentRequest.attachments[1].resource.size,
          mimetype: paymentRequest.attachments[1].resource.mimetype,
          downloadUrl: paymentRequest.attachments[1].resource.downloadUrl,
          createdAt: paymentRequest.attachments[1].resource.createdAt,
          deletedAt: paymentRequest.attachments[1].deletedAt,
          resourceDeletedAt: paymentRequest.attachments[1].resource.deletedAt,
        },
      ]);
      expect(paymentCase.attachments.map((attachment) => attachment.id)).toEqual([
        paymentRequest.attachments[0].id,
        paymentRequest.attachments[1].id,
      ]);
      expect(paymentCase.attachments[1]).toEqual(
        expect.objectContaining({
          deletedAt: new Date(`2026-04-13T00:00:00.000Z`),
          resourceDeletedAt: new Date(`2026-04-13T00:00:00.000Z`),
        }),
      );
    });

    it(`maps forensic ledger entries with exact output shape and stringifies amount`, () => {
      const presenter = buildPresenter();
      const paymentRequest = buildCaseRow();
      const paymentCase = presenter.mapPaymentRequestCase(paymentRequest, [], buildAssignmentContext());

      expect(paymentCase.ledgerEntries).toEqual([
        {
          id: paymentRequest.ledgerEntries[0].id,
          ledgerId: paymentRequest.ledgerEntries[0].ledgerId,
          type: paymentRequest.ledgerEntries[0].type,
          amount: paymentRequest.ledgerEntries[0].amount.toString(),
          currencyCode: paymentRequest.ledgerEntries[0].currencyCode,
          effectiveStatus: $Enums.TransactionStatus.COMPLETED,
          createdAt: paymentRequest.ledgerEntries[0].createdAt,
          deletedAt: paymentRequest.ledgerEntries[0].deletedAt,
        },
        {
          id: paymentRequest.ledgerEntries[1].id,
          ledgerId: paymentRequest.ledgerEntries[1].ledgerId,
          type: paymentRequest.ledgerEntries[1].type,
          amount: paymentRequest.ledgerEntries[1].amount.toString(),
          currencyCode: paymentRequest.ledgerEntries[1].currencyCode,
          effectiveStatus: $Enums.TransactionStatus.COMPLETED,
          createdAt: paymentRequest.ledgerEntries[1].createdAt,
          deletedAt: paymentRequest.ledgerEntries[1].deletedAt,
        },
      ]);
      expect(paymentCase.ledgerEntries.map((entry) => entry.id)).toEqual([
        paymentRequest.ledgerEntries[0].id,
        paymentRequest.ledgerEntries[1].id,
      ]);
      expect(paymentCase.ledgerEntries[0].effectiveStatus).toBe($Enums.TransactionStatus.COMPLETED);
      expect(paymentRequest.ledgerEntries[0].status).toBe($Enums.TransactionStatus.PENDING);
      expect(paymentCase.ledgerEntries[0].amount).toBe(paymentRequest.ledgerEntries[0].amount.toString());
      expect(paymentCase.ledgerEntries[1]).toEqual(
        expect.objectContaining({
          deletedAt: new Date(`2026-04-14T00:00:00.000Z`),
        }),
      );
    });
  });

  describe(`mapPaymentOperationsQueueItem`, () => {
    it(`returns the exact current public output shape for a representative queue item`, () => {
      const presenter = buildPresenter();
      const assignedTo = buildAssignee({ id: `admin-shape`, email: `shape@example.com` });
      const row = buildQueueRow({
        id: `payment-shape`,
        amount: new Prisma.Decimal(`88.40`),
        currencyCode: $Enums.CurrencyCode.EUR,
        status: $Enums.TransactionStatus.PENDING,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        dueDate: new Date(`2026-04-21T00:00:00.000Z`),
        createdAt: new Date(`2026-04-19T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-20T11:00:00.000Z`),
        payer: { id: `payer-88`, email: `payer-88@example.com` },
        requester: { id: `requester-88`, email: `requester-88@example.com` },
        payerEmail: `payer-fallback@example.com`,
        requesterEmail: `requester-fallback@example.com`,
        attachments: [
          {
            id: `attachment-shape-a`,
            resource: { id: `resource-shape-a`, resourceTags: [{ tag: { name: `INVOICE-88` } }] },
          },
          {
            id: `attachment-shape-b`,
            resource: { id: `resource-shape-b`, resourceTags: [{ tag: { name: `MISC-88` } }] },
          },
        ],
        ledgerEntries: [
          {
            id: `ledger-shape`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-04-20T09:00:00.000Z`),
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ],
      });

      expect(presenter.mapPaymentOperationsQueueItem(row, assignedTo)).toStrictEqual({
        id: `payment-shape`,
        amount: `88.4`,
        currencyCode: $Enums.CurrencyCode.EUR,
        persistedStatus: $Enums.TransactionStatus.PENDING,
        effectiveStatus: $Enums.TransactionStatus.COMPLETED,
        staleWarning: true,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        payer: {
          id: `payer-88`,
          email: `payer-88@example.com`,
        },
        requester: {
          id: `requester-88`,
          email: `requester-88@example.com`,
        },
        dueDate: new Date(`2026-04-21T00:00:00.000Z`),
        createdAt: new Date(`2026-04-19T10:00:00.000Z`),
        updatedAt: new Date(`2026-04-20T11:00:00.000Z`),
        attachmentsCount: 2,
        invoiceTaggedAttachmentsCount: 1,
        dataFreshnessClass: `bounded-snapshot`,
        assignedTo,
      });
    });

    it(`computes stale warnings and invoice-tagged attachment counts from current public output`, () => {
      const presenter = buildPresenter();

      expect(
        presenter.mapPaymentOperationsQueueItem(
          buildQueueRow({
            status: $Enums.TransactionStatus.PENDING,
            attachments: [
              { id: `attachment-a`, resource: { id: `resource-a`, resourceTags: [{ tag: { name: `INVOICE-123` } }] } },
              { id: `attachment-b`, resource: { id: `resource-b`, resourceTags: [{ tag: { name: `invoice-123` } }] } },
              {
                id: `attachment-c`,
                resource: { id: `resource-c`, resourceTags: [{ tag: { name: `PRE-INVOICE-123` } }] },
              },
              { id: `attachment-d`, resource: { id: `resource-d`, resourceTags: [{ tag: { name: `INVOICE-456` } }] } },
            ],
            ledgerEntries: [
              {
                id: `ledger-stale`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-04-12T00:00:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          }),
        ),
      ).toEqual(
        expect.objectContaining({
          staleWarning: true,
          invoiceTaggedAttachmentsCount: 2,
        }),
      );

      expect(
        presenter.mapPaymentOperationsQueueItem(
          buildQueueRow({
            status: $Enums.TransactionStatus.WAITING,
            attachments: [{ id: `attachment-z`, resource: { id: `resource-z`, resourceTags: [] } }],
            ledgerEntries: [],
          }),
        ),
      ).toEqual(
        expect.objectContaining({
          staleWarning: false,
          invoiceTaggedAttachmentsCount: 0,
        }),
      );
    });
  });

  describe(`mapPaymentOperationsQueue`, () => {
    it(`passes through generatedAt exactly from the input queue payload`, () => {
      const presenter = buildPresenter();
      const now = new Date(`2026-05-15T12:34:56.789Z`);

      const queue = presenter.mapPaymentOperationsQueue({
        now,
        overdueRows: [],
        uncollectibleRows: [],
        staleApprovalRows: [],
        inconsistentRows: [],
        missingAttachmentRows: [],
        assigneeMap: new Map(),
      });

      expect(queue.generatedAt).toBe(now);
      expect(queue.generatedAt.toISOString()).toBe(`2026-05-15T12:34:56.789Z`);
    });

    it(`returns buckets in the current order with exact operator prompts and follow-up reasons`, () => {
      const presenter = buildPresenter();
      const assignee = buildAssignee();
      const queue = presenter.mapPaymentOperationsQueue({
        now: new Date(`2026-05-15T00:00:00.000Z`),
        overdueRows: [buildQueueRow({ id: `payment-overdue` })],
        uncollectibleRows: [
          buildQueueRow({
            id: `payment-uncollectible`,
            status: $Enums.TransactionStatus.UNCOLLECTIBLE,
            paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
            dueDate: null,
            updatedAt: new Date(`2026-04-11T00:00:00.000Z`),
            attachments: [
              {
                id: `attachment-2`,
                resource: { id: `resource-2`, resourceTags: [{ tag: { name: `INVOICE-UNCOLLECTIBLE` } }] },
              },
            ],
          }),
        ],
        staleApprovalRows: [
          buildQueueRow({
            id: `payment-stale-approval`,
            status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
            dueDate: null,
            createdAt: new Date(`2000-01-01T00:00:00.000Z`),
            updatedAt: new Date(`2000-01-02T00:00:00.000Z`),
            attachments: [
              {
                id: `attachment-stale-approval`,
                resource: { id: `resource-stale-approval`, resourceTags: [{ tag: { name: `INVOICE-PENDING` } }] },
              },
            ],
          }),
        ],
        inconsistentRows: [
          buildQueueRow({
            id: `payment-stale`,
            status: $Enums.TransactionStatus.PENDING,
            dueDate: null,
            updatedAt: new Date(`2026-04-12T00:00:00.000Z`),
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
          }),
        ],
        missingAttachmentRows: [
          buildQueueRow({
            id: `payment-missing-attachment`,
            dueDate: null,
            updatedAt: new Date(`2026-04-13T00:00:00.000Z`),
            attachments: [],
          }),
          buildQueueRow({
            id: `payment-missing-invoice-link`,
            dueDate: null,
            createdAt: new Date(`2026-03-24T00:00:00.000Z`),
            updatedAt: new Date(`2026-04-14T00:00:00.000Z`),
            attachments: [{ id: `attachment-5`, resource: { id: `resource-5`, resourceTags: [] } }],
          }),
        ],
        assigneeMap: new Map([
          [`payment-overdue`, assignee],
          [`payment-stale`, assignee],
        ]),
      });

      expect(queue.posture).toEqual({
        kind: `non_sla_follow_up_queue`,
        wording: `Manual review queue`,
      });
      expect(queue.buckets.map((bucket) => bucket.key)).toEqual([
        `overdue_requests`,
        `uncollectible_requests`,
        `stale_waiting_recipient_approval`,
        `inconsistent_status`,
        `missing_attachment_or_invoice_linkage`,
      ]);
      expect(queue.buckets.map((bucket) => bucket.label)).toEqual([
        `Overdue requests`,
        `UNCOLLECTIBLE requests`,
        `Stale WAITING_RECIPIENT_APPROVAL`,
        `Inconsistent status cases`,
        `Missing attachment or invoice linkage`,
      ]);
      expect(queue.buckets.map((bucket) => bucket.operatorPrompt)).toEqual([
        `Review overdue payment requests and continue investigation from the payment detail view.`,
        [
          `Review UNCOLLECTIBLE payment requests as a separate collections outcome`,
          `before continuing from the payment detail view.`,
        ].join(` `),
        `Review payment requests that remain in WAITING_RECIPIENT_APPROVAL beyond the current review window.`,
        `Review cases where persisted request status and latest settlement status disagree.`,
        `Review cases with missing supporting attachments or missing invoice-tagged attachment links.`,
      ]);

      const overdueBucket = queue.buckets[0];
      const uncollectibleBucket = queue.buckets[1];
      const staleApprovalBucket = queue.buckets[2];
      const inconsistentBucket = queue.buckets[3];
      const missingBucket = queue.buckets[4];

      expect(overdueBucket.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-overdue`,
          assignedTo: assignee,
          followUpReason: `Due date passed while the payment request remains in an active review status`,
        }),
      );
      expect(uncollectibleBucket.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-uncollectible`,
          followUpReason: `Payment request is marked UNCOLLECTIBLE and requires collections-focused review`,
        }),
      );
      expect(staleApprovalBucket.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-stale-approval`,
          followUpReason: `Payment request remains in WAITING_RECIPIENT_APPROVAL beyond the current review window`,
        }),
      );
      expect(inconsistentBucket.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-stale`,
          assignedTo: assignee,
          staleWarning: true,
          followUpReason: `Persisted payment status diverges from the latest settlement status`,
        }),
      );
      expect(missingBucket.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: `payment-missing-attachment`,
            followUpReason: `Payment request has no supporting attachment`,
          }),
          expect.objectContaining({
            id: `payment-missing-invoice-link`,
            followUpReason: `Payment request has no invoice-tagged attachment linkage`,
          }),
        ]),
      );
    });

    it(`applies assignedTo decoration consistently across all queue bucket types`, () => {
      const presenter = buildPresenter();
      const overdueAssignee = buildAssignee({ id: `admin-overdue`, email: `overdue@example.com` });
      const uncollectibleAssignee = buildAssignee({ id: `admin-uncollectible`, email: `uncollectible@example.com` });
      const staleApprovalAssignee = buildAssignee({ id: `admin-stale`, email: `stale@example.com` });
      const inconsistentAssignee = buildAssignee({ id: `admin-inconsistent`, email: `inconsistent@example.com` });
      const missingAssignee = buildAssignee({ id: `admin-missing`, email: `missing@example.com` });
      const queue = presenter.mapPaymentOperationsQueue({
        now: new Date(`2026-05-15T00:00:00.000Z`),
        overdueRows: [buildQueueRow({ id: `payment-overdue-assigned` })],
        uncollectibleRows: [
          buildQueueRow({
            id: `payment-uncollectible-assigned`,
            status: $Enums.TransactionStatus.UNCOLLECTIBLE,
            dueDate: null,
          }),
        ],
        staleApprovalRows: [
          buildQueueRow({
            id: `payment-stale-assigned`,
            status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
            dueDate: null,
          }),
        ],
        inconsistentRows: [
          buildQueueRow({
            id: `payment-inconsistent-assigned`,
            status: $Enums.TransactionStatus.PENDING,
            dueDate: null,
            ledgerEntries: [
              {
                id: `ledger-inconsistent-assigned`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-04-12T00:00:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          }),
        ],
        missingAttachmentRows: [
          buildQueueRow({
            id: `payment-missing-assigned`,
            dueDate: null,
            attachments: [],
          }),
        ],
        assigneeMap: new Map([
          [`payment-overdue-assigned`, overdueAssignee],
          [`payment-uncollectible-assigned`, uncollectibleAssignee],
          [`payment-stale-assigned`, staleApprovalAssignee],
          [`payment-inconsistent-assigned`, inconsistentAssignee],
          [`payment-missing-assigned`, missingAssignee],
        ]),
      });

      expect(queue.buckets.find((bucket) => bucket.key === `overdue_requests`)?.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-overdue-assigned`,
          assignedTo: overdueAssignee,
        }),
      );
      expect(queue.buckets.find((bucket) => bucket.key === `uncollectible_requests`)?.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-uncollectible-assigned`,
          assignedTo: uncollectibleAssignee,
        }),
      );
      expect(queue.buckets.find((bucket) => bucket.key === `stale_waiting_recipient_approval`)?.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-stale-assigned`,
          assignedTo: staleApprovalAssignee,
        }),
      );
      expect(queue.buckets.find((bucket) => bucket.key === `inconsistent_status`)?.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-inconsistent-assigned`,
          assignedTo: inconsistentAssignee,
        }),
      );
      expect(queue.buckets.find((bucket) => bucket.key === `missing_attachment_or_invoice_linkage`)?.items[0]).toEqual(
        expect.objectContaining({
          id: `payment-missing-assigned`,
          assignedTo: missingAssignee,
        }),
      );
    });

    it(`filters then truncates inconsistent and missing-attachment buckets to the first 25 surviving items`, () => {
      const presenter = buildPresenter();
      const inconsistentRows = Array.from({ length: 45 }, (_, index) =>
        buildQueueRow({
          id: `payment-inconsistent-${index}`,
          status: $Enums.TransactionStatus.PENDING,
          dueDate: null,
          updatedAt: new Date(`2026-04-12T00:00:${String(index).padStart(2, `0`)}.000Z`),
          ledgerEntries:
            index % 3 === 0
              ? []
              : [
                  {
                    id: `ledger-inconsistent-${index}`,
                    type: $Enums.LedgerEntryType.USER_PAYMENT,
                    status: $Enums.TransactionStatus.PENDING,
                    createdAt: new Date(`2026-04-12T00:00:${String(index).padStart(2, `0`)}.000Z`),
                    outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
                  },
                ],
        }),
      );
      const missingAttachmentRows = Array.from({ length: 45 }, (_, index) =>
        buildQueueRow({
          id: `payment-missing-${index}`,
          dueDate: null,
          updatedAt: new Date(`2026-04-13T00:00:${String(index).padStart(2, `0`)}.000Z`),
          attachments:
            index % 3 === 0
              ? [
                  {
                    id: `attachment-ok-${index}`,
                    resource: { id: `resource-ok-${index}`, resourceTags: [{ tag: { name: `INVOICE-${index}` } }] },
                  },
                ]
              : index % 2 === 0
                ? []
                : [
                    {
                      id: `attachment-missing-${index}`,
                      resource: { id: `resource-missing-${index}`, resourceTags: [] },
                    },
                  ],
        }),
      );

      const queue = presenter.mapPaymentOperationsQueue({
        now: new Date(`2026-05-15T00:00:00.000Z`),
        overdueRows: [buildQueueRow({ id: `overdue-a` }), buildQueueRow({ id: `overdue-b` })],
        uncollectibleRows: [
          buildQueueRow({ id: `uncollectible-a`, status: $Enums.TransactionStatus.UNCOLLECTIBLE, dueDate: null }),
        ],
        staleApprovalRows: [
          buildQueueRow({
            id: `stale-approval-a`,
            status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
            dueDate: null,
          }),
        ],
        inconsistentRows,
        missingAttachmentRows,
        assigneeMap: new Map(),
      });

      const inconsistentBucket = queue.buckets.find((bucket) => bucket.key === `inconsistent_status`);
      const missingBucket = queue.buckets.find((bucket) => bucket.key === `missing_attachment_or_invoice_linkage`);
      const expectedInconsistentIds = inconsistentRows
        .filter((row) => presenter.mapPaymentOperationsQueueItem(row).effectiveStatus !== row.status)
        .slice(0, 25)
        .map((row) => row.id);
      const expectedMissingIds = missingAttachmentRows
        .filter((row) => {
          const item = presenter.mapPaymentOperationsQueueItem(row);
          return item.attachmentsCount === 0 || item.invoiceTaggedAttachmentsCount === 0;
        })
        .slice(0, 25)
        .map((row) => row.id);

      expect(inconsistentBucket?.items).toHaveLength(25);
      expect(inconsistentBucket?.items.map((item) => item.id)).toEqual(expectedInconsistentIds);
      expect(missingBucket?.items).toHaveLength(25);
      expect(missingBucket?.items.map((item) => item.id)).toEqual(expectedMissingIds);
      expect(queue.buckets.find((bucket) => bucket.key === `overdue_requests`)?.items.map((item) => item.id)).toEqual([
        `overdue-a`,
        `overdue-b`,
      ]);
      expect(
        queue.buckets.find((bucket) => bucket.key === `uncollectible_requests`)?.items.map((item) => item.id),
      ).toEqual([`uncollectible-a`]);
      expect(
        queue.buckets.find((bucket) => bucket.key === `stale_waiting_recipient_approval`)?.items.map((item) => item.id),
      ).toEqual([`stale-approval-a`]);
    });
  });
});
