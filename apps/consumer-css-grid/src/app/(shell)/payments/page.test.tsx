import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

import type * as ConsumerApi from '../../../lib/consumer-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/consumer-api.server`, () => ({
  getPaymentsResult: jest.fn(),
  getSettings: jest.fn(),
  getContacts: jest.fn(),
  getExchangeCurrencies: jest.fn(),
}));

const {
  getPaymentsResult: mockedGetPaymentsResult,
  getSettings: mockedGetSettings,
  getContacts: mockedGetContacts,
  getExchangeCurrencies: mockedGetExchangeCurrencies,
} = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./PaymentsClient`, () => ({
  PaymentsClient: () => React.createElement(`section`, null, `Payments client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid payments route contextual help`, () => {
  beforeAll(async () => {
    PaymentsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentsResult.mockReset();
    mockedGetSettings.mockReset();
    mockedGetContacts.mockReset();
    mockedGetExchangeCurrencies.mockReset();

    mockedGetPaymentsResult.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
      unavailable: false,
    });
    mockedGetSettings.mockResolvedValue({
      preferredCurrency: `USD`,
    });
    mockedGetContacts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    mockedGetExchangeCurrencies.mockResolvedValue([]);
  });

  it(`renders focused help links above the payments list surface`, async () => {
    const markup = renderToStaticMarkup(
      await PaymentsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Find the right payment flow faster`);
    expect(markup).toContain(`Payments client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT}`);
  });

  it(`normalizes unsafe pagination before loading payments`, async () => {
    await PaymentsPage({
      searchParams: Promise.resolve({
        page: `2.9`,
        pageSize: `1000000000`,
      }),
    });

    expect(mockedGetPaymentsResult).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 100,
      }),
      expect.any(Object),
    );
  });

  it.each([[`Infinity`], [`NaN`], [`0`], [`-5`], [`not-a-number`]])(
    `falls back for invalid pageSize value %s`,
    async (pageSize) => {
      await PaymentsPage({
        searchParams: Promise.resolve({ pageSize }),
      });

      expect(mockedGetPaymentsResult).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
        }),
        expect.any(Object),
      );
    },
  );

  it(`renders an unavailable banner without hiding the workspace`, async () => {
    mockedGetPaymentsResult.mockResolvedValue({
      data: null,
      unavailable: true,
    });

    const markup = renderToStaticMarkup(
      await PaymentsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Payments data is temporarily unavailable`);
    expect(markup).toContain(`Payments client loaded`);
  });
});
