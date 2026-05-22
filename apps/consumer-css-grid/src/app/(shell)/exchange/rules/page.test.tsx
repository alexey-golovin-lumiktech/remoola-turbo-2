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
  getExchangeCurrenciesResult: jest.fn(),
  getExchangeRulesResult: jest.fn(),
}));

const {
  getExchangeCurrenciesResult: mockedGetExchangeCurrenciesResult,
  getExchangeRulesResult: mockedGetExchangeRulesResult,
} = jest.requireMock(`../../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`../../../../lib/mutations/exchange.server`, () => ({
  createExchangeRuleMutation: jest.fn(),
  updateExchangeRuleMutation: jest.fn(),
  deleteExchangeRuleMutation: jest.fn(),
}));

jest.mock(`../ExchangeRulesSection`, () => ({
  ExchangeRulesSection: () => React.createElement(`section`, null, `Exchange rules section`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeRulesPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid exchange rules contextual help`, () => {
  beforeAll(async () => {
    ExchangeRulesPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetExchangeCurrenciesResult.mockReset();
    mockedGetExchangeRulesResult.mockReset();

    mockedGetExchangeCurrenciesResult.mockResolvedValue({
      data: [
        { code: `USD`, symbol: `$`, name: `US Dollar` },
        { code: `EUR`, symbol: `EUR`, name: `Euro` },
      ],
      unavailable: false,
    });
    mockedGetExchangeRulesResult.mockResolvedValue({
      data: {
        items: [],
        total: 0,
      },
      unavailable: false,
    });
  });

  it(`renders exchange automation help on the rules route`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeRulesPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Understand rule thresholds before you automate conversions`);
    expect(markup).toContain(`Loading exchange rules...`);
    expect(markup).toContain(`href="/exchange"`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES}`);
  });
});
