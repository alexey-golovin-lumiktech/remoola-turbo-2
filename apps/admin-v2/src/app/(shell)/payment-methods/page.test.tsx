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
  getPaymentMethods: jest.fn(),
}));

const { getPaymentMethods: mockedGetPaymentMethods } = jest.requireMock(`../../../lib/admin-api.server`) as jest.Mocked<
  typeof AdminApi
>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentMethodsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 payment methods list kickoff surface`, () => {
  beforeAll(async () => {
    PaymentMethodsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentMethods.mockReset();
    mockedGetPaymentMethods.mockResolvedValue({
      items: [
        {
          id: `pm-soft`,
          type: `CREDIT_CARD`,
          brand: `Visa`,
          last4: `4242`,
          bankLast4: null,
          status: `DISABLED`,
          defaultSelected: true,
          stripeFingerprint: `fp-shared`,
          disabledAt: `2026-04-16T10:30:00.000Z`,
          createdAt: `2026-04-16T08:00:00.000Z`,
          updatedAt: `2026-04-16T09:00:00.000Z`,
          deletedAt: `2026-04-16T10:00:00.000Z`,
          consumer: {
            id: `consumer-1`,
            email: `owner@example.com`,
          },
        },
      ],
      total: 1,
      page: 2,
      pageSize: 1,
    });
  });

  it(`renders the read-only kickoff framing and schema-backed list links`, async () => {
    const markup = renderToStaticMarkup(
      await PaymentMethodsPage({
        searchParams: Promise.resolve({
          page: `2`,
          consumerId: `consumer-1`,
          type: `CREDIT_CARD`,
          defaultSelected: `true`,
          fingerprint: `fp-shared`,
          includeDeleted: `true`,
        }),
      }),
    );

    expect(mockedGetPaymentMethods).toHaveBeenCalledWith({
      page: 2,
      consumerId: `consumer-1`,
      type: `CREDIT_CARD`,
      defaultSelected: true,
      fingerprint: `fp-shared`,
      includeDeleted: true,
    });
    expect(markup).toContain(`Investigation-first list surface for payment methods`);
    expect(markup).toContain(`<form class="actionsRow" method="get">`);
    expect(markup).toContain(`/payment-methods/pm-soft`);
    expect(markup).toContain(`/consumers/consumer-1`);
    expect(markup).toContain(`Soft-deleted`);
    expect(markup).toContain(`Read-only queue`);
    expect(markup).not.toContain(`Disable payment method`);
    expect(markup).not.toContain(`Remove default marker`);
    expect(markup).not.toContain(`Escalate duplicate fingerprint`);
    expect(markup).not.toContain(`duplicate-escalate`);
  });
});
