import { describe, expect, it } from '@jest/globals';

import { buildPaymentsPageMetrics } from './payments-filters-state';

describe(`payments-filters-state`, () => {
  it(`derives page metrics from the current visible payments`, () => {
    const metrics = buildPaymentsPageMetrics(
      [
        {
          id: `payment-1`,
          description: `Invoice`,
          counterparty: { email: `vendor@example.com` },
          createdAt: `2026-04-01T10:00:00.000Z`,
          latestTransaction: null,
          amount: 100,
          currencyCode: `USD`,
          status: `DRAFT`,
          role: `REQUESTER`,
          type: `INVOICE`,
        },
        {
          id: `payment-2`,
          description: `Refund`,
          counterparty: { email: `payer@example.com` },
          createdAt: `2026-04-02T10:00:00.000Z`,
          latestTransaction: null,
          amount: 50,
          currencyCode: `USD`,
          status: `COMPLETED`,
          role: `PAYER`,
          type: `REFUND`,
        },
      ] as never,
      40,
      20,
    );

    expect(metrics.incomingCount).toBe(1);
    expect(metrics.outgoingCount).toBe(1);
    expect(metrics.processingCount).toBe(1);
    expect(metrics.totalPages).toBe(2);
  });
});
