import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

const mockedNotFound = jest.fn(() => {
  throw new Error(`NEXT_NOT_FOUND`);
});

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: mockedNotFound,
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getAdmins: jest.fn(),
  getPayoutCaseResult: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  escalatePayoutAction: jest.fn(),
  claimPayoutAssignmentAction: jest.fn(),
  releasePayoutAssignmentAction: jest.fn(),
  reassignPayoutAssignmentAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getAdmins: mockedGetAdmins,
  getPayoutCaseResult: mockedGetPayoutCaseResult,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PayoutCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildPayoutCase() {
  return {
    id: `payout-1`,
    core: {
      id: `payout-1`,
      ledgerId: `ledger-1`,
      type: `USER_PAYOUT`,
      amount: `-48.00`,
      currencyCode: `USD`,
      persistedStatus: `PENDING`,
      effectiveStatus: `DENIED`,
      derivedStatus: `failed`,
      externalReference: `ref-failed`,
      createdAt: `2026-04-14T00:00:00.000Z`,
      updatedAt: `2026-04-14T08:00:00.000Z`,
    },
    consumer: {
      id: `consumer-1`,
      email: `consumer@example.com`,
    },
    paymentRequest: {
      id: `payment-1`,
      amount: `48.00`,
      currencyCode: `USD`,
      status: `COMPLETED`,
      paymentRail: `BANK_TRANSFER`,
      payerId: `consumer-1`,
      payerEmail: `consumer@example.com`,
      requesterId: `consumer-2`,
      requesterEmail: `merchant@example.com`,
    },
    metadata: {
      paymentMethodId: `pm-1`,
      payoutReference: `ref-failed`,
    },
    outcomes: [
      {
        id: `outcome-1`,
        status: `DENIED`,
        source: `stripe`,
        externalId: `po_1`,
        createdAt: `2026-04-14T08:00:00.000Z`,
      },
    ],
    relatedEntries: [
      {
        id: `payout-1`,
        type: `USER_PAYOUT`,
        amount: `-48.00`,
        currencyCode: `USD`,
        effectiveStatus: `DENIED`,
        createdAt: `2026-04-14T00:00:00.000Z`,
      },
      {
        id: `payout-reversal`,
        type: `USER_PAYOUT_REVERSAL`,
        amount: `48.00`,
        currencyCode: `USD`,
        effectiveStatus: `COMPLETED`,
        createdAt: `2026-04-15T00:00:00.000Z`,
      },
    ],
    auditContext: [],
    assignment: {
      current: null,
      history: [],
    },
    outcomeAgeHours: 4,
    slaBreachDetected: false,
    version: 1713081600000,
    stuckPolicy: {
      thresholdHours: 24,
      breachCondition: `the latest payout outcome is still pending-like after the current threshold`,
      escalationTarget: `manual review with payout_escalate available only for failed or stuck payouts`,
      expectedOperatorReaction: `review the payout case, confirm destination linkage and use payout_escalate only when the payout is failed or stuck`,
      automationStatus: `This list is detected automatically; payout execution writes remain disabled`,
    },
    highValuePolicy: {
      availability: `configured`,
      source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
      wording: `High-value payouts are derived from configured per-currency thresholds. Currencies without an explicit threshold remain non-evaluable.`,
      configuredThresholds: [{ currencyCode: `USD`, amount: `100` }],
    },
    highValue: {
      eligibility: `below-threshold`,
      thresholdAmount: `100`,
      thresholdCurrency: `USD`,
    },
    payoutEscalation: null,
    actionControls: {
      canEscalate: true,
      allowedActions: [`payout_escalate`],
      escalateBlockedReason: null,
    },
    staleWarning: true,
    dataFreshnessClass: `exact`,
    destinationAvailability: `linked`,
    destinationLinkageSource: `metadata.paymentMethodId`,
    destinationPaymentMethodSummary: {
      id: `pm-1`,
      type: `BANK_ACCOUNT`,
      brand: null,
      last4: null,
      bankLast4: `5511`,
      deletedAt: null,
    },
  };
}

describe(`admin-v2 payout case`, () => {
  beforeAll(async () => {
    PayoutCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetAdmins.mockReset();
    mockedGetPayoutCaseResult.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `payouts workspace`,
      capabilities: [`ledger.read`, `payouts.escalate`, `assignments.manage`],
      workspaces: [`ledger`],
    });
    mockedGetAdmins.mockResolvedValue({
      items: [],
      pendingInvitations: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    mockedGetPayoutCaseResult.mockResolvedValue({ status: `ready`, data: buildPayoutCase() });
  });

  it(`shows the escalation block reason instead of an actionable form when escalation is forbidden`, async () => {
    mockedGetPayoutCaseResult.mockResolvedValueOnce({
      status: `ready`,
      data: {
        ...buildPayoutCase(),
        core: {
          ...buildPayoutCase().core,
          derivedStatus: `completed`,
          effectiveStatus: `COMPLETED`,
        },
        actionControls: {
          canEscalate: false,
          allowedActions: [],
          escalateBlockedReason: `Only failed or stuck payouts can receive an escalation marker in the current operator slice`,
        },
      },
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(mockedGetAdmins).not.toHaveBeenCalled();
    expect(markup).toContain(
      `Only failed or stuck payouts can receive an escalation marker in the current operator slice`,
    );
    expect(markup).not.toContain(`>Escalate payout<`);
  });

  it(`keeps the escalation marker visible once an escalation already exists`, async () => {
    mockedGetPayoutCaseResult.mockResolvedValueOnce({
      status: `ready`,
      data: {
        ...buildPayoutCase(),
        payoutEscalation: {
          id: `esc-1`,
          reason: `Ops handoff`,
          confirmed: true,
          createdAt: `2026-04-16T10:00:00.000Z`,
          escalatedBy: {
            id: `admin-1`,
            email: `super@example.com`,
          },
        },
        actionControls: {
          canEscalate: false,
          allowedActions: [],
          escalateBlockedReason: `Payout already has an active escalation marker`,
        },
      },
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(mockedGetAdmins).not.toHaveBeenCalled();
    expect(markup).toContain(`Active payout escalation marker`);
    expect(markup).toContain(`Ops handoff`);
    expect(markup).toContain(`Payout already has an active escalation marker`);
    expect(markup).not.toContain(`>Escalate payout<`);
  });

  it(`omits the destination link when no payout destination payment method is available`, async () => {
    mockedGetPayoutCaseResult.mockResolvedValueOnce({
      status: `ready`,
      data: {
        ...buildPayoutCase(),
        destinationAvailability: `unavailable`,
        destinationLinkageSource: null,
        destinationPaymentMethodSummary: null,
      },
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(markup).toContain(`Destination method unavailable.`);
    expect(markup).toContain(`No payout destination link could be confirmed`);
    expect(markup).not.toContain(`/payment-methods/pm-1`);
  });

  it(`delegates missing payout records to notFound`, async () => {
    mockedGetPayoutCaseResult.mockResolvedValueOnce({ status: `not_found` });

    await expect(
      PayoutCasePage({
        params: Promise.resolve({ payoutId: `missing-payout` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it(`fetches reassign candidates only for reassignable assignments`, async () => {
    const assignedAt = `2026-04-15T09:00:00.000Z`;
    mockedGetPayoutCaseResult.mockResolvedValueOnce({
      status: `ready`,
      data: {
        ...buildPayoutCase(),
        assignment: {
          current: {
            id: `assignment-1`,
            assignedTo: { id: `admin-2`, name: null, email: `ops@example.com` },
            assignedBy: { id: `admin-2`, name: null, email: `ops@example.com` },
            assignedAt,
            reason: `Investigating failed payout`,
            expiresAt: null,
          },
          history: [
            {
              id: `assignment-1`,
              assignedTo: { id: `admin-2`, name: null, email: `ops@example.com` },
              assignedBy: { id: `admin-2`, name: null, email: `ops@example.com` },
              assignedAt,
              releasedAt: null,
              releasedBy: null,
              reason: `Investigating failed payout`,
              expiresAt: null,
            },
          ],
        },
      },
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(mockedGetAdmins).toHaveBeenCalledWith({ page: 1, pageSize: 50, status: `ACTIVE` });
    expect(markup).toContain(`ops@example.com`);
    expect(markup).toContain(`>Reassign<`);
  });

  it(`renders an access denied surface for forbidden payout reads`, async () => {
    mockedGetPayoutCaseResult.mockResolvedValueOnce({ status: `forbidden` });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(markup).toContain(`Payout case unavailable`);
    expect(markup).toContain(`cannot access this payout surface`);
  });
});
