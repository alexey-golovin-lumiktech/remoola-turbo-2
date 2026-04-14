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
  getAvailableBalances: jest.fn(),
  getExchangeCurrencies: jest.fn(),
  getExchangeRatesBatch: jest.fn(),
  getExchangeRules: jest.fn(),
  getScheduledConversions: jest.fn(),
}));

const {
  getAvailableBalances: mockedGetAvailableBalances,
  getExchangeCurrencies: mockedGetExchangeCurrencies,
  getExchangeRatesBatch: mockedGetExchangeRatesBatch,
  getExchangeRules: mockedGetExchangeRules,
  getScheduledConversions: mockedGetScheduledConversions,
} = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./ExchangeClient`, () => ({
  ExchangeClient: () => React.createElement(`section`, null, `Exchange client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangePage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid exchange route contextual help`, () => {
  beforeAll(async () => {
    ExchangePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAvailableBalances.mockReset();
    mockedGetExchangeCurrencies.mockReset();
    mockedGetExchangeRatesBatch.mockReset();
    mockedGetExchangeRules.mockReset();
    mockedGetScheduledConversions.mockReset();

    mockedGetExchangeCurrencies.mockResolvedValue([
      { code: `USD`, symbol: `$`, name: `US Dollar` },
      { code: `EUR`, symbol: `EUR`, name: `Euro` },
    ]);
    mockedGetAvailableBalances.mockResolvedValue({
      USD: 500000,
      EUR: 250000,
    });
    mockedGetExchangeRules.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockedGetScheduledConversions.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockedGetExchangeRatesBatch.mockResolvedValue({
      items: [],
      unavailable: false,
    });
  });

  it(`renders contextual help for the main exchange route`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangePage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Choose between quote, convert now, and automation`);
    expect(markup).toContain(`Exchange client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES}`);
  });
});
