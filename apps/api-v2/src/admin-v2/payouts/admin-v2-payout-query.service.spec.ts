import { NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PayoutQueryService } from './admin-v2-payout-query.service';
import { type AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import { type PayoutHighValuePolicyService } from './payout-high-value-policy.service';
import { type PayoutPaymentMethodResolverService } from './payout-payment-method-resolver.service';
import { type AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

describe(`AdminV2PayoutQueryService`, () => {
  function buildService() {
    const assignmentsService = {
      getActiveAssigneesForResource: jest.fn(async () => new Map()),
      getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })),
    };
    const payoutsQuery = {
      listPayoutRows: jest.fn(),
      findPayoutCaseEntry: jest.fn(),
      findRelatedEntries: jest.fn(),
      findAuditContext: jest.fn(),
    };
    const highValuePolicy = {
      getConfig: jest.fn(() => ({
        policy: {
          availability: `configured`,
          source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
          wording: `configured`,
          configuredThresholds: [{ currencyCode: $Enums.CurrencyCode.USD, amount: `100` }],
        },
        thresholds: new Map(),
      })),
      assess: jest.fn(() => ({
        eligibility: `high-value`,
        thresholdAmount: `100`,
        thresholdCurrency: $Enums.CurrencyCode.USD,
      })),
    };
    const paymentMethodResolver = {
      getPaymentMethodsById: jest.fn(async () => new Map()),
      resolveDestination: jest.fn(() => ({
        destinationPaymentMethodSummary: null,
        destinationAvailability: `unavailable`,
        destinationLinkageSource: null,
      })),
    };

    return {
      assignmentsService,
      highValuePolicy,
      paymentMethodResolver,
      payoutsQuery,
      service: new AdminV2PayoutQueryService(
        assignmentsService as unknown as AdminV2AssignmentsService,
        payoutsQuery as unknown as AdminV2PayoutsRepository,
        highValuePolicy as unknown as PayoutHighValuePolicyService,
        paymentMethodResolver as unknown as PayoutPaymentMethodResolverService,
      ),
    };
  }

  it(`assembles payout list items with assignment, high-value, destination, and pagination overlays`, async () => {
    const { assignmentsService, paymentMethodResolver, payoutsQuery, service } = buildService();
    const firstCreatedAt = new Date(`2026-04-16T09:00:00.000Z`);
    payoutsQuery.listPayoutRows.mockResolvedValueOnce([
      {
        id: `payout-1`,
        ledgerId: `ledger-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: new Prisma.Decimal(`-120.00`),
        stripeId: `po_1`,
        metadata: { paymentMethodId: `pm-1`, payoutReference: `ref-1` },
        consumerId: `consumer-1`,
        paymentRequestId: null,
        createdAt: firstCreatedAt,
        updatedAt: new Date(`2026-04-16T09:30:00.000Z`),
        consumer: { email: `consumer@example.com` },
        payoutEscalation: null,
        outcomes: [
          {
            id: `outcome-1`,
            status: $Enums.TransactionStatus.DENIED,
            externalId: `po_1`,
            createdAt: new Date(`2026-04-16T10:00:00.000Z`),
          },
        ],
      },
      {
        id: `payout-next`,
        ledgerId: `ledger-next`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: new Prisma.Decimal(`-1.00`),
        stripeId: null,
        metadata: null,
        consumerId: `consumer-next`,
        paymentRequestId: null,
        createdAt: new Date(`2026-04-15T09:00:00.000Z`),
        updatedAt: new Date(`2026-04-15T09:30:00.000Z`),
        consumer: null,
        payoutEscalation: null,
        outcomes: [],
      },
    ]);
    assignmentsService.getActiveAssigneesForResource.mockResolvedValueOnce(
      new Map([[`payout-1`, { id: `admin-1`, name: null, email: `ops@example.com` }]]),
    );
    paymentMethodResolver.resolveDestination.mockReturnValueOnce({
      destinationPaymentMethodSummary: {
        id: `pm-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `5511`,
        deletedAt: null,
      },
      destinationAvailability: `linked`,
      destinationLinkageSource: `metadata.paymentMethodId`,
    });

    const result = await service.listPayouts({ limit: 1 });

    expect(payoutsQuery.listPayoutRows).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: null,
        type: { in: [$Enums.LedgerEntryType.USER_PAYOUT, $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL] },
      }),
      2,
    );
    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(`payout`, [`payout-1`]);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: `payout-1`,
        effectiveStatus: `DENIED`,
        derivedStatus: `failed`,
        externalReference: `ref-1`,
        highValue: expect.objectContaining({ eligibility: `high-value` }),
        destinationAvailability: `linked`,
        assignedTo: { id: `admin-1`, name: null, email: `ops@example.com` },
      }),
    ]);
    expect(result.pageInfo.limit).toBe(1);
    expect(result.pageInfo.nextCursor).toEqual(expect.any(String));
    expect(result.highValuePolicy.availability).toBe(`configured`);
  });

  it(`assembles payout case details with assignment context, action controls, and destination overlay`, async () => {
    const { assignmentsService, paymentMethodResolver, payoutsQuery, service } = buildService();
    const updatedAt = new Date(`2026-04-14T01:00:00.000Z`);
    payoutsQuery.findPayoutCaseEntry.mockResolvedValueOnce({
      id: `payout-case`,
      ledgerId: `ledger-case`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      amount: new Prisma.Decimal(`-120.00`),
      stripeId: `po_case`,
      metadata: { paymentMethodId: `pm-1`, payoutReference: `ref-case` },
      consumerId: `consumer-1`,
      paymentRequestId: `payment-1`,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt,
      consumer: { email: `consumer@example.com` },
      payoutEscalation: null,
      paymentRequest: {
        id: `payment-1`,
        amount: new Prisma.Decimal(`120.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        payerId: `consumer-1`,
        payerEmail: `consumer@example.com`,
        requesterId: `consumer-2`,
        requesterEmail: `merchant@example.com`,
        payer: { email: `consumer@example.com` },
        requester: { email: `merchant@example.com` },
      },
      outcomes: [
        {
          id: `outcome-latest`,
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe`,
          externalId: `po_case`,
          createdAt: new Date(`2026-04-14T03:00:00.000Z`),
        },
      ],
    });
    payoutsQuery.findRelatedEntries.mockResolvedValueOnce([
      {
        id: `payout-case`,
        ledgerId: `payout-ledger-group-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        amount: new Prisma.Decimal(`-120.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-04-14T00:00:00.000Z`),
        outcomes: [{ status: $Enums.TransactionStatus.DENIED }],
      },
    ]);
    payoutsQuery.findAuditContext.mockResolvedValueOnce([
      {
        id: `audit-1`,
        action: `payout_escalate`,
        resource: `payout`,
        resourceId: `payout-case`,
        admin: { email: `ops@example.com` },
        createdAt: new Date(`2026-04-14T04:00:00.000Z`),
      },
    ]);
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce({
      current: { id: `assignment-1` },
      history: [],
    });
    paymentMethodResolver.resolveDestination.mockReturnValueOnce({
      destinationPaymentMethodSummary: null,
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
    });

    const result = await service.getPayoutCase(`payout-case`);

    expect(payoutsQuery.findAuditContext).toHaveBeenCalledWith([`payout-case`, `payment-1`]);
    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`payout`, `payout-case`);
    expect(result.core).toEqual(
      expect.objectContaining({
        id: `payout-case`,
        effectiveStatus: `DENIED`,
        derivedStatus: `failed`,
        externalReference: `ref-case`,
      }),
    );
    expect(result.version).toBe(updatedAt.getTime());
    expect(result.actionControls).toEqual({
      canEscalate: true,
      allowedActions: [`payout_escalate`],
      escalateBlockedReason: null,
    });
    expect(result.assignment).toEqual({ current: { id: `assignment-1` }, history: [] });
    expect(result.auditContext).toEqual([expect.objectContaining({ id: `audit-1`, adminEmail: `ops@example.com` })]);
    expect(result.destinationAvailability).toBe(`unavailable`);
  });

  it(`throws not found for missing payout cases`, async () => {
    const { payoutsQuery, service } = buildService();
    payoutsQuery.findPayoutCaseEntry.mockResolvedValueOnce(null);

    await expect(service.getPayoutCase(`missing-payout`)).rejects.toBeInstanceOf(NotFoundException);
  });
});
