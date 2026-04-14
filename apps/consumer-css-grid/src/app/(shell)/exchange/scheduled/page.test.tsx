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
  getExchangeCurrencies: jest.fn(),
  getAvailableBalances: jest.fn(),
  getScheduledConversions: jest.fn(),
}));

const {
  getExchangeCurrencies: mockedGetExchangeCurrencies,
  getAvailableBalances: mockedGetAvailableBalances,
  getScheduledConversions: mockedGetScheduledConversions,
} = jest.requireMock(`../../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`../../../../lib/consumer-mutations.server`, () => ({
  scheduleExchangeMutation: jest.fn(),
  cancelScheduledExchangeMutation: jest.fn(),
}));

jest.mock(`../ExchangeScheduledSection`, () => ({
  ExchangeScheduledSection: () => React.createElement(`section`, null, `Scheduled exchange section`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeScheduledPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid exchange scheduled contextual help`, () => {
  beforeAll(async () => {
    ExchangeScheduledPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetExchangeCurrencies.mockReset();
    mockedGetAvailableBalances.mockReset();
    mockedGetScheduledConversions.mockReset();

    mockedGetExchangeCurrencies.mockResolvedValue([
      { code: `USD`, symbol: `$`, name: `US Dollar` },
      { code: `EUR`, symbol: `EUR`, name: `Euro` },
    ]);
    mockedGetAvailableBalances.mockResolvedValue({
      USD: 500000,
      EUR: 250000,
    });
    mockedGetScheduledConversions.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it(`renders scheduled exchange help on the scheduled route`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeScheduledPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Scheduled conversions`);
    expect(markup).toContain(`Scheduled exchange section`);
    expect(markup).toContain(`Plan future conversions without losing exchange context`);
    expect(markup).toContain(`href="/exchange"`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES}`);
  });
});
