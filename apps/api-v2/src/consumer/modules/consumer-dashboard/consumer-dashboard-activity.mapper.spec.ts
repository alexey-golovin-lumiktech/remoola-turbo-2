import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { getDashboardPaymentMethodIds, mapFinancialActivityItem } from './consumer-dashboard-activity.mapper';
import { type DashboardActivityLedgerRow } from './consumer-dashboard.query';

function buildRow(overrides: Partial<DashboardActivityLedgerRow> = {}): DashboardActivityLedgerRow {
  return {
    id: `entry-1`,
    ledgerId: `ledger-1`,
    type: $Enums.LedgerEntryType.USER_PAYOUT,
    status: $Enums.TransactionStatus.PENDING,
    amount: -12.34,
    currencyCode: $Enums.CurrencyCode.USD,
    createdAt: new Date(`2026-03-25T17:23:20.000Z`),
    metadata: {
      rail: $Enums.PaymentRail.CARD,
      paymentMethodId: `pm-1`,
    },
    paymentRequestId: null,
    ...overrides,
  };
}

describe(`consumer dashboard activity mapper`, () => {
  it(`collects typed payment method ids from metadata`, () => {
    expect(
      getDashboardPaymentMethodIds([
        buildRow({ metadata: { paymentMethodId: `pm-1` } }),
        buildRow({ metadata: { paymentMethodId: `pm-1` } }),
        buildRow({ metadata: { paymentMethodId: 42 } }),
      ]),
    ).toEqual([`pm-1`]);
  });

  it(`maps payout activity with payment method label`, () => {
    const item = mapFinancialActivityItem(buildRow(), new Map([[`pm-1`, `Visa •••• 4242`]]));

    expect(item).toEqual({
      id: `ledger-1`,
      label: `Withdrawal`,
      description: `Pending • 12.34 USD • to Visa •••• 4242`,
      createdAt: `2026-03-25T17:23:20.000Z`,
      kind: `withdrawal`,
    });
  });
});
