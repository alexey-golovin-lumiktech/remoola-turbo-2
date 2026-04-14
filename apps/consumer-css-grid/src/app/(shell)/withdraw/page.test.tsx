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
  getPaymentHistory: jest.fn(),
  getPaymentMethods: jest.fn(),
}));

const {
  getAvailableBalances: mockedGetAvailableBalances,
  getPaymentHistory: mockedGetPaymentHistory,
  getPaymentMethods: mockedGetPaymentMethods,
} = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./WithdrawFlowClient`, () => ({
  WithdrawFlowClient: () => React.createElement(`section`, null, `Withdraw flow client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let WithdrawPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid withdraw route contextual help`, () => {
  beforeAll(async () => {
    WithdrawPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAvailableBalances.mockReset();
    mockedGetPaymentHistory.mockReset();
    mockedGetPaymentMethods.mockReset();

    mockedGetAvailableBalances.mockResolvedValue({ USD: 125000 });
    mockedGetPaymentHistory.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockedGetPaymentMethods.mockResolvedValue({
      items: [],
    });
  });

  it(`renders contextual help for the withdraw route`, async () => {
    const markup = renderToStaticMarkup(await WithdrawPage());

    expect(markup).toContain(`Check withdrawal prerequisites before moving funds`);
    expect(markup).toContain(`Withdraw flow client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS}`);
  });
});
