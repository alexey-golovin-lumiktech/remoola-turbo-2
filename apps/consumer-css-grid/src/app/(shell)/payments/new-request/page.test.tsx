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
  getContacts: jest.fn(),
  getExchangeCurrencies: jest.fn(),
  getSettings: jest.fn(),
}));

const {
  getContacts: mockedGetContacts,
  getExchangeCurrencies: mockedGetExchangeCurrencies,
  getSettings: mockedGetSettings,
} = jest.requireMock(`../../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`../CreatePaymentRequestForm`, () => ({
  CreatePaymentRequestForm: () => React.createElement(`section`, null, `Create payment request form`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let NewPaymentRequestPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid new payment request route contextual help`, () => {
  beforeAll(async () => {
    NewPaymentRequestPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetContacts.mockReset();
    mockedGetExchangeCurrencies.mockReset();
    mockedGetSettings.mockReset();

    mockedGetContacts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    mockedGetExchangeCurrencies.mockResolvedValue([]);
    mockedGetSettings.mockResolvedValue({
      preferredCurrency: `USD`,
    });
  });

  it(`renders contextual help for the new payment request route`, async () => {
    const markup = renderToStaticMarkup(
      await NewPaymentRequestPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`New Payment Request`);
    expect(markup).toContain(`Back to payments`);
    expect(markup).toContain(`Guides for payment-request setup`);
    expect(markup).toContain(`Create payment request form`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH}`);
  });
});
