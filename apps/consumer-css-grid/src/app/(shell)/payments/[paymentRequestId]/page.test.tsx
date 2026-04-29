import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';

import type * as ConsumerApi from '../../../../lib/consumer-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/consumer-api.server`, () => ({
  getPaymentView: jest.fn(),
  getContractDetails: jest.fn(),
  getDocuments: jest.fn(),
  getPaymentMethods: jest.fn(),
}));

const { getPaymentView: mockedGetPaymentView, getContractDetails: mockedGetContractDetails } = jest.requireMock(
  `../../../../lib/consumer-api.server`,
) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`../PaymentDetailActionsClient`, () => ({
  PaymentDetailActionsClient: () => React.createElement(`section`, null, `Payment detail actions`),
}));

jest.mock(`../PaymentAttachmentsClient`, () => ({
  PaymentAttachmentsClient: () => React.createElement(`section`, null, `Payment attachments`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentDetailPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid payment detail contextual help`, () => {
  beforeAll(async () => {
    PaymentDetailPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentView.mockReset();
    mockedGetContractDetails.mockReset();

    mockedGetPaymentView.mockResolvedValue({
      id: `payment-1`,
      amount: 1200,
      currencyCode: `USD`,
      status: `COMPLETED`,
      role: `REQUESTER`,
      description: `April invoice`,
      payer: { email: `payer@example.com` },
      requester: { email: `requester@example.com` },
      createdAt: `2026-04-01T10:00:00.000Z`,
      updatedAt: `2026-04-02T11:00:00.000Z`,
      dueDate: `2026-04-05`,
      sentDate: `2026-04-01T12:00:00.000Z`,
      ledgerEntries: [],
      attachments: [],
    });
  });

  it(`renders contextual help for the payment detail route with focused guide links`, async () => {
    const markup = renderToStaticMarkup(
      await PaymentDetailPage({
        params: Promise.resolve({ paymentRequestId: `payment-1` }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Need help with this payment state?`);
    expect(markup).toContain(`Payment detail actions`);
    expect(markup).toContain(`Loading attachments...`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_STATUSES}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
  });
});
