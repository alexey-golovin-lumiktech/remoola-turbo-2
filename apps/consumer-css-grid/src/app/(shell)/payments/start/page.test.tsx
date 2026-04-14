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
  getSettings: jest.fn(),
}));

const { getSettings: mockedGetSettings } = jest.requireMock(`../../../../lib/consumer-api.server`) as jest.Mocked<
  typeof ConsumerApi
>;

jest.mock(`./StartPaymentClient`, () => ({
  StartPaymentClient: () => React.createElement(`section`, null, `Start payment client`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let StartPaymentPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid start payment route contextual help`, () => {
  beforeAll(async () => {
    StartPaymentPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetSettings.mockReset();
    mockedGetSettings.mockResolvedValue({
      preferredCurrency: `USD`,
    });
  });

  it(`renders contextual help for the start payment route`, async () => {
    const markup = renderToStaticMarkup(
      await StartPaymentPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Start Payment`);
    expect(markup).toContain(`Back to payments`);
    expect(markup).toContain(`Guides for payer-side payment setup`);
    expect(markup).toContain(`Start payment client`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_STATUSES}`);
  });
});
