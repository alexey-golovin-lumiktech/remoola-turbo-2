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
  getPaymentMethods: jest.fn(),
}));

const { getPaymentMethods: mockedGetPaymentMethods } = jest.requireMock(
  `../../../lib/consumer-api.server`,
) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./BankingClient`, () => ({
  BankingClient: () => React.createElement(`section`, null, `Banking client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let BankingPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid banking route contextual help`, () => {
  beforeAll(async () => {
    BankingPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentMethods.mockReset();
    mockedGetPaymentMethods.mockResolvedValue({
      items: [],
    });
  });

  it(`renders banking help links above the banking workspace`, async () => {
    const markup = renderToStaticMarkup(await BankingPage());

    expect(markup).toContain(`Use Banking as the setup surface for payout and saved methods`);
    expect(markup).toContain(`Banking client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.BANKING_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES}`);
  });
});
