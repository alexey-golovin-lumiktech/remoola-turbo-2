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
  getPayoutCase: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  escalatePayoutAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getPayoutCase: mockedGetPayoutCase } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

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
    outcomeAgeHours: 4,
    slaBreachDetected: false,
    version: 1713081600000,
    stuckPolicy: {
      thresholdHours: 24,
      breachCondition: `latest pending-like payout outcome is older than the current threshold`,
      escalationTarget: `human review with payout_escalate available only for failed or stuck payouts`,
      expectedOperatorReaction: `review the payout case, verify destination linkage and use payout_escalate only when the payout is failed or stuck`,
      automationStatus: `machine-detected queue only; payout execution writes remain disabled`,
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
    mockedGetPayoutCase.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: payouts.write`,
      capabilities: [`ledger.read`, `payouts.escalate`],
      workspaces: [`ledger`],
    });
    mockedGetPayoutCase.mockResolvedValue(buildPayoutCase());
  });

  it(`renders payout truth and the narrow payout_escalate affordance only on the case page`, async () => {
    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(mockedGetPayoutCase).toHaveBeenCalledWith(`payout-1`);
    expect(markup).toContain(`Derived payout status follows the latest ledger outcome`);
    expect(markup).toContain(`/ledger/payout-1`);
    expect(markup).toContain(`/payment-methods/pm-1`);
    expect(markup).toContain(`/payments/payment-1`);
    expect(markup).toContain(`BANK_ACCOUNT •••• 5511`);
    expect(markup).toContain(`Threshold: 24h`);
    expect(markup).toContain(`Escalate payout`);
    expect(markup).toContain(`Creates one durable escalation marker only`);
    expect(markup).not.toContain(`Retry payout`);
    expect(markup).not.toContain(`Cancel payout`);
  });

  it(`hides the escalation form for forbidden statuses while keeping the case truthful`, async () => {
    mockedGetPayoutCase.mockResolvedValueOnce({
      ...buildPayoutCase(),
      core: {
        ...buildPayoutCase().core,
        derivedStatus: `completed`,
        effectiveStatus: `COMPLETED`,
      },
      actionControls: {
        canEscalate: false,
        allowedActions: [],
        escalateBlockedReason: `Only failed or stuck payouts can be escalated in MVP-2`,
      },
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(markup).toContain(`Only failed or stuck payouts can be escalated in MVP-2`);
    expect(markup).not.toContain(`Retry payout`);
    expect(markup).not.toContain(`Force execute`);
  });

  it(`renders an active escalation marker when one already exists`, async () => {
    mockedGetPayoutCase.mockResolvedValueOnce({
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
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(markup).toContain(`Active escalation marker`);
    expect(markup).toContain(`Ops handoff`);
    expect(markup).toContain(`Payout already has an active escalation marker`);
  });

  it(`renders truthful destination unavailability instead of fabricating linkage`, async () => {
    mockedGetPayoutCase.mockResolvedValueOnce({
      ...buildPayoutCase(),
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
      destinationPaymentMethodSummary: null,
    });

    const markup = renderToStaticMarkup(
      await PayoutCasePage({
        params: Promise.resolve({ payoutId: `payout-1` }),
      }),
    );

    expect(markup).toContain(`Destination method unavailable.`);
    expect(markup).toContain(`No schema-backed payout destination linkage could be confirmed`);
    expect(markup).not.toContain(`/payment-methods/pm-1`);
  });

  it(`delegates missing payout records to notFound`, async () => {
    mockedGetPayoutCase.mockResolvedValueOnce(null);

    await expect(
      PayoutCasePage({
        params: Promise.resolve({ payoutId: `missing-payout` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
