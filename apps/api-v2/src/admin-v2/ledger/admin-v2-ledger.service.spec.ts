import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2LedgerService } from './admin-v2-ledger.service';

const LEDGER_ENTRY_ID = `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
const ASSIGNED_TO_ID = `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;
const ASSIGNED_BY_ID = `cccccccc-cccc-4ccc-8ccc-cccccccccccc`;
const RELEASED_BY_ID = `dddddddd-dddd-4ddd-dddd-dddddddddddd`;
const ASSIGNMENT_ID_ACTIVE = `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`;
const ASSIGNMENT_ID_RELEASED = `ffffffff-ffff-4fff-8fff-ffffffffffff`;

type AssignmentRowFixture = {
  id: string;
  resource_id: string;
  assigned_to: string;
  assigned_by: string | null;
  released_by: string | null;
  assigned_at: Date;
  released_at: Date | null;
  expires_at: Date | null;
  reason: string | null;
  assigned_to_email: string | null;
  assigned_by_email: string | null;
  released_by_email: string | null;
};

function rowToAdminRef(id: string | null, email: string | null) {
  if (!id) return null;
  return { id, name: null, email };
}

function buildAssignmentContextFromRows(rows: AssignmentRowFixture[]) {
  const currentRow = rows.find((row) => row.released_at === null) ?? null;
  const current = currentRow
    ? {
        id: currentRow.id,
        assignedTo: rowToAdminRef(currentRow.assigned_to, currentRow.assigned_to_email) ?? {
          id: currentRow.assigned_to,
          name: null,
          email: null,
        },
        assignedBy: rowToAdminRef(currentRow.assigned_by, currentRow.assigned_by_email),
        assignedAt: currentRow.assigned_at.toISOString(),
        reason: currentRow.reason,
        expiresAt: currentRow.expires_at ? currentRow.expires_at.toISOString() : null,
      }
    : null;
  const history = rows.map((row) => ({
    id: row.id,
    assignedTo: rowToAdminRef(row.assigned_to, row.assigned_to_email) ?? {
      id: row.assigned_to,
      name: null,
      email: null,
    },
    assignedBy: rowToAdminRef(row.assigned_by, row.assigned_by_email),
    assignedAt: row.assigned_at.toISOString(),
    releasedAt: row.released_at ? row.released_at.toISOString() : null,
    releasedBy: rowToAdminRef(row.released_by, row.released_by_email),
    reason: row.reason,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  }));
  return { current, history };
}

function buildLedgerListRow(id: string = LEDGER_ENTRY_ID) {
  return {
    id,
    ledgerId: `ledger-group-1`,
    type: $Enums.LedgerEntryType.USER_PAYMENT,
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.PENDING,
    amount: new Prisma.Decimal(`48.00`),
    feesType: null,
    feesAmount: null,
    stripeId: null,
    idempotencyKey: null,
    metadata: null,
    consumerId: `consumer-1`,
    paymentRequestId: null,
    createdAt: new Date(`2026-04-13T00:00:00.000Z`),
    updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
    consumer: { email: `consumer@example.com` },
    paymentRequest: null,
    outcomes: [],
    disputes: [],
  };
}

function buildLedgerCaseEntry(id: string = LEDGER_ENTRY_ID) {
  return {
    ...buildLedgerListRow(id),
    paymentRequest: null,
    outcomes: [],
    disputes: [],
  };
}

function buildService() {
  const query = {
    listLedgerEntries: jest.fn<(...a: any[]) => any>(),
    getLedgerEntryCase: jest.fn<(...a: any[]) => any>(),
    listDisputes: jest.fn<(...a: any[]) => any>(),
  };
  const assignmentsService = {
    getAssignmentContextForResource: jest.fn<(...a: any[]) => any>(),
    getActiveAssigneesForResource: jest.fn<(...a: any[]) => any>(),
  };

  return {
    service: new AdminV2LedgerService(query as never, assignmentsService as never),
    query,
    assignmentsService,
  };
}

describe(`AdminV2LedgerService`, () => {
  it(`uses latest outcome semantics on ledger case instead of earliest outcome`, async () => {
    const { service, query, assignmentsService } = buildService();
    query.getLedgerEntryCase.mockResolvedValueOnce({
      entry: {
        ...buildLedgerCaseEntry(`ledger-1`),
        ledgerId: `ledger-group-1`,
        stripeId: `pi_123`,
        idempotencyKey: `idem-1`,
        paymentRequestId: `payment-1`,
        paymentRequest: {
          id: `payment-1`,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: $Enums.PaymentRail.CARD,
          payerId: `consumer-1`,
          requesterId: `consumer-2`,
          amount: new Prisma.Decimal(`48.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          payer: { email: `payer@example.com` },
          requester: { email: `requester@example.com` },
        },
        outcomes: [
          {
            id: `outcome-latest`,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: `pi_123`,
            createdAt: new Date(`2026-04-13T03:00:00.000Z`),
          },
          {
            id: `outcome-earliest`,
            status: $Enums.TransactionStatus.WAITING,
            source: `stripe`,
            externalId: `pi_122`,
            createdAt: new Date(`2026-04-13T02:00:00.000Z`),
          },
        ],
      },
      relatedEntries: [
        {
          id: `ledger-1`,
          ledgerId: `ledger-group-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          amount: new Prisma.Decimal(`48.00`),
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
        },
      ],
      auditContext: [],
    });
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce({ current: null, history: [] });

    const ledgerCase = await service.getLedgerEntryCase(`ledger-1`);

    expect(ledgerCase.core.persistedStatus).toBe(`PENDING`);
    expect(ledgerCase.core.effectiveStatus).toBe(`COMPLETED`);
    expect(ledgerCase.staleWarning).toBe(true);
    expect(ledgerCase.outcomes.map((item) => item.id)).toEqual([`outcome-latest`, `outcome-earliest`]);
    expect(ledgerCase.assignment).toEqual({ current: null, history: [] });
  });

  it(`throws not found when the query does not return a ledger case`, async () => {
    const { service, query } = buildService();
    query.getLedgerEntryCase.mockResolvedValueOnce(null);

    await expect(service.getLedgerEntryCase(`missing-ledger`)).rejects.toBeInstanceOf(NotFoundException);
  });

  it(`returns assignment.current populated with one history entry when the entry is actively assigned`, async () => {
    const { service, query, assignmentsService } = buildService();
    const assignedAt = new Date(`2026-04-21T08:00:00.000Z`);
    const expiresAt = new Date(`2026-04-21T20:00:00.000Z`);
    query.getLedgerEntryCase.mockResolvedValueOnce({
      entry: buildLedgerCaseEntry(),
      relatedEntries: [],
      auditContext: [],
    });
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce(
      buildAssignmentContextFromRows([
        {
          id: ASSIGNMENT_ID_ACTIVE,
          resource_id: LEDGER_ENTRY_ID,
          assigned_to: ASSIGNED_TO_ID,
          assigned_by: ASSIGNED_BY_ID,
          released_by: null,
          assigned_at: assignedAt,
          released_at: null,
          expires_at: expiresAt,
          reason: `Assigned for cross-rail review`,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `super@example.com`,
          released_by_email: null,
        },
      ]),
    );

    const ledgerCase = await service.getLedgerEntryCase(LEDGER_ENTRY_ID);

    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`ledger_entry`, LEDGER_ENTRY_ID);
    expect(ledgerCase.assignment.current).toEqual({
      id: ASSIGNMENT_ID_ACTIVE,
      assignedTo: { id: ASSIGNED_TO_ID, name: null, email: `ops@example.com` },
      assignedBy: { id: ASSIGNED_BY_ID, name: null, email: `super@example.com` },
      assignedAt: assignedAt.toISOString(),
      reason: `Assigned for cross-rail review`,
      expiresAt: expiresAt.toISOString(),
    });
    expect(ledgerCase.assignment.history).toHaveLength(1);
  });

  it(`returns null current and a released row in history when the only assignment is released`, async () => {
    const { service, query, assignmentsService } = buildService();
    const assignedAt = new Date(`2026-04-20T08:00:00.000Z`);
    const releasedAt = new Date(`2026-04-20T10:30:00.000Z`);
    query.getLedgerEntryCase.mockResolvedValueOnce({
      entry: buildLedgerCaseEntry(),
      relatedEntries: [],
      auditContext: [],
    });
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce(
      buildAssignmentContextFromRows([
        {
          id: ASSIGNMENT_ID_RELEASED,
          resource_id: LEDGER_ENTRY_ID,
          assigned_to: ASSIGNED_TO_ID,
          assigned_by: ASSIGNED_BY_ID,
          released_by: RELEASED_BY_ID,
          assigned_at: assignedAt,
          released_at: releasedAt,
          expires_at: null,
          reason: null,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `super@example.com`,
          released_by_email: `ops@example.com`,
        },
      ]),
    );

    const ledgerCase = await service.getLedgerEntryCase(LEDGER_ENTRY_ID);

    expect(ledgerCase.assignment.current).toBeNull();
    expect(ledgerCase.assignment.history).toHaveLength(1);
    expect(ledgerCase.assignment.history[0]).toMatchObject({
      id: ASSIGNMENT_ID_RELEASED,
      assignedAt: assignedAt.toISOString(),
      releasedAt: releasedAt.toISOString(),
      releasedBy: { id: RELEASED_BY_ID, name: null, email: `ops@example.com` },
    });
  });

  it(`merges active assignee onto ledger entries via post-map bulk lookup`, async () => {
    const { service, query, assignmentsService } = buildService();
    const ledgerEntryIdAssigned = `11111111-1111-4111-8111-111111111111`;
    const ledgerEntryIdUnassigned = `22222222-2222-4222-8222-222222222222`;
    const assigneeId = `33333333-3333-4333-8333-333333333333`;
    query.listLedgerEntries.mockResolvedValueOnce({
      rows: [buildLedgerListRow(ledgerEntryIdAssigned), buildLedgerListRow(ledgerEntryIdUnassigned)],
      nextCursorSource: null,
    });
    assignmentsService.getActiveAssigneesForResource.mockResolvedValueOnce(
      new Map([[ledgerEntryIdAssigned, { id: assigneeId, name: `Alice`, email: `alice@example.com` }]]),
    );

    const result = await service.listLedgerEntries({});

    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(`ledger_entry`, [
      ledgerEntryIdAssigned,
      ledgerEntryIdUnassigned,
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: ledgerEntryIdAssigned,
      assignedTo: { id: assigneeId, name: `Alice`, email: `alice@example.com` },
    });
    expect(result.items[1]).toMatchObject({
      id: ledgerEntryIdUnassigned,
      assignedTo: null,
    });
  });

  it(`maps canonical disputeStatus metadata for standalone disputes surface`, async () => {
    const { service, query } = buildService();
    query.listDisputes.mockResolvedValueOnce({
      rows: [
        {
          id: `dispute-row-1`,
          stripeDisputeId: `dp_fixture_open`,
          metadata: { disputeStatus: `open`, reason: `fraudulent`, amount: 4800 },
          createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          ledgerEntry: {
            id: `ledger-1`,
            ledgerId: `ledger-group-1`,
            paymentRequestId: `payment-1`,
            consumerId: `consumer-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            amount: new Prisma.Decimal(`48.00`),
            currencyCode: $Enums.CurrencyCode.USD,
            paymentRequest: {
              paymentRail: $Enums.PaymentRail.CARD,
            },
          },
        },
      ],
      nextCursorSource: null,
    });

    const disputes = await service.listDisputes();

    expect(disputes.items).toEqual([
      expect.objectContaining({
        id: `dispute-row-1`,
        stripeDisputeId: `dp_fixture_open`,
        disputeStatus: `open`,
        reason: `fraudulent`,
        metadata: {
          disputeStatus: `open`,
          reason: `fraudulent`,
          amount: 4800,
        },
      }),
    ]);
  });
});
