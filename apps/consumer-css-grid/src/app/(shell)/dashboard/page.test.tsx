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
  getDashboardData: jest.fn(),
  getBalances: jest.fn(),
  getAvailableBalances: jest.fn(),
}));

const {
  getDashboardData: mockedGetDashboardData,
  getBalances: mockedGetBalances,
  getAvailableBalances: mockedGetAvailableBalances,
} = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./DashboardVerificationAction`, () => ({
  DashboardVerificationAction: () => React.createElement(`div`, null, `Verification action`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let DashboardPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid dashboard contextual help`, () => {
  beforeAll(async () => {
    DashboardPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetDashboardData.mockReset();
    mockedGetBalances.mockReset();
    mockedGetAvailableBalances.mockReset();

    mockedGetDashboardData.mockResolvedValue({
      data: {
        summary: {
          balanceCurrencyCode: `USD`,
          availableBalanceCurrencyCode: `USD`,
          balanceCents: 250000,
          availableBalanceCents: 125000,
          activeRequests: 0,
          lastPaymentAt: null,
        },
        pendingRequests: [],
        pendingWithdrawals: {
          items: [],
          total: 0,
        },
        quickDocs: [],
        activity: [],
        tasks: [],
        verification: {
          effectiveVerified: false,
          profileComplete: true,
          status: `not_started`,
          canStart: true,
          legalVerified: false,
          reviewStatus: `not_started`,
          stripeStatus: `not_started`,
          sessionId: null,
          lastErrorCode: null,
          lastErrorReason: null,
          startedAt: null,
          updatedAt: null,
          verifiedAt: null,
        },
      },
      unavailable: false,
    });
    mockedGetBalances.mockResolvedValue({ USD: 250000 });
    mockedGetAvailableBalances.mockResolvedValue({ USD: 125000 });
  });

  it(`renders representative contextual help entrypoints across the dashboard route`, async () => {
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain(`Use the dashboard as a launch point`);
    expect(markup).toContain(`Need help starting the first payment flow?`);
    expect(markup).toContain(`Need help interpreting an empty dashboard?`);
    expect(markup).toContain(`Need help preparing documents?`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH}`);
  });
});
