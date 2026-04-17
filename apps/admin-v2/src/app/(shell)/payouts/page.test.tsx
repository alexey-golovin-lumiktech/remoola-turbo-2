import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getPayouts: jest.fn(),
}));

const { getPayouts: mockedGetPayouts } = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<
  typeof AdminApi
>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PayoutsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 payouts read-only queue`, () => {
  beforeAll(async () => {
    PayoutsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPayouts.mockReset();
    mockedGetPayouts.mockResolvedValue({
      generatedAt: `2026-04-17T12:00:00.000Z`,
      posture: {
        kind: `threshold_derived_follow_up_queue`,
        wording: `Ledger-derived payout queue with a single regulated action path: failed or stuck payouts may be escalated, and all other payout statuses remain investigation-only.`,
      },
      stuckPolicy: {
        thresholdHours: 24,
        breachCondition: `latest pending-like payout outcome is older than the current threshold`,
        escalationTarget: `human review with payout_escalate available only for failed or stuck payouts`,
        expectedOperatorReaction: `open payout case, inspect outcome timeline, verify destination/payment context and escalate only if the payout is failed or stuck`,
        automationStatus: `machine-detected queue only; payout execution writes remain disabled`,
      },
      highValuePolicy: {
        availability: `configured`,
        source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
        wording: `High-value payouts are derived from configured per-currency thresholds. Currencies without an explicit threshold remain non-evaluable.`,
        configuredThresholds: [{ currencyCode: `USD`, amount: `100` }],
      },
      items: [
        {
          id: `payout-failed`,
          ledgerId: `ledger-1`,
          type: `USER_PAYOUT`,
          amount: `-48.00`,
          currencyCode: `USD`,
          persistedStatus: `PENDING`,
          effectiveStatus: `DENIED`,
          derivedStatus: `failed`,
          externalReference: `ref-failed`,
          consumer: {
            id: `consumer-1`,
            email: `consumer@example.com`,
          },
          paymentRequestId: null,
          createdAt: `2026-04-14T00:00:00.000Z`,
          updatedAt: `2026-04-14T08:00:00.000Z`,
          staleWarning: true,
          dataFreshnessClass: `exact`,
          outcomeAgeHours: 4,
          slaBreachDetected: false,
          highValue: {
            eligibility: `below-threshold`,
            thresholdAmount: `100`,
            thresholdCurrency: `USD`,
          },
          hasActiveEscalation: false,
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
        },
        {
          id: `payout-stuck`,
          ledgerId: `ledger-2`,
          type: `USER_PAYOUT`,
          amount: `-90.00`,
          currencyCode: `EUR`,
          persistedStatus: `PENDING`,
          effectiveStatus: `PENDING`,
          derivedStatus: `stuck`,
          externalReference: `ref-stuck`,
          consumer: {
            id: `consumer-2`,
            email: `stuck@example.com`,
          },
          paymentRequestId: `payment-1`,
          createdAt: `2026-04-13T00:00:00.000Z`,
          updatedAt: `2026-04-14T00:00:00.000Z`,
          staleWarning: false,
          dataFreshnessClass: `exact`,
          outcomeAgeHours: 48,
          slaBreachDetected: true,
          highValue: {
            eligibility: `high-value`,
            thresholdAmount: `100`,
            thresholdCurrency: `EUR`,
          },
          hasActiveEscalation: true,
          destinationAvailability: `unavailable`,
          destinationLinkageSource: null,
          destinationPaymentMethodSummary: null,
        },
      ],
      pageInfo: {
        nextCursor: `cursor-2`,
        limit: 25,
      },
    });
  });

  it(`renders threshold-derived queue framing with a truthful high-value bucket and no forbidden payout actions`, async () => {
    const markup = renderToStaticMarkup(
      await PayoutsPage({
        searchParams: Promise.resolve({
          cursor: `cursor-1`,
        }),
      }),
    );

    expect(mockedGetPayouts).toHaveBeenCalledWith({
      cursor: `cursor-1`,
    });
    expect(markup).toContain(`Ledger-derived payout queue with a single regulated action path`);
    expect(markup).toContain(`Threshold: 24h`);
    expect(markup).toContain(`High-value payouts`);
    expect(markup).toContain(`Configured thresholds: USD &gt;= 100`);
    expect(markup).toContain(`/payouts/payout-failed`);
    expect(markup).toContain(`/payouts/payout-stuck`);
    expect(markup).toContain(`/payments/payment-1`);
    expect(markup).toContain(`/consumers/consumer-1`);
    expect(markup).toContain(`Destination: BANK_ACCOUNT •••• 5511`);
    expect(markup).toContain(`Destination: Unavailable`);
    expect(markup).toContain(`High-value: high-value`);
    expect(markup).not.toContain(`Retry payout`);
    expect(markup).not.toContain(`Force execute`);
  });
});
