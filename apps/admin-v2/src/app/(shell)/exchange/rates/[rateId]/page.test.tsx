import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../../lib/admin-api.server';

const mockedNotFound = jest.fn(() => {
  throw new Error(`NEXT_NOT_FOUND`);
});

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: mockedNotFound,
}));

jest.mock(`../../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getExchangeRateCase: jest.fn(),
}));

jest.mock(`../../../../../lib/admin-mutations.server`, () => ({
  approveExchangeRateAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getExchangeRateCase: mockedGetExchangeRateCase } = jest.requireMock(
  `../../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeRateCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildRateCase() {
  return {
    id: `rate-1`,
    core: {
      id: `rate-1`,
      sourceCurrency: `USD`,
      targetCurrency: `EUR`,
      rate: `0.92`,
      inverseRate: `1.08695652`,
      spreadBps: 12,
      confidence: 87,
      status: `DRAFT`,
      provider: `ECB`,
      providerRateId: `ecb-1`,
      fetchedAt: `2026-04-17T08:00:00.000Z`,
      effectiveAt: `2026-04-17T08:00:00.000Z`,
      expiresAt: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: `2026-04-17T07:55:00.000Z`,
      deletedAt: null,
    },
    approvalHistory: [],
    stalenessIndicator: {
      isStale: true,
      ageMinutes: 180,
      referenceAt: `2026-04-17T08:00:00.000Z`,
      thresholdMinutes: 120,
    },
    actionControls: {
      canApprove: true,
      allowedActions: [`exchange_rate_approve`],
    },
    version: 1713341100000,
    updatedAt: `2026-04-17T08:05:00.000Z`,
    staleWarning: false,
    dataFreshnessClass: `exact`,
  };
}

describe(`admin-v2 exchange rate case`, () => {
  beforeAll(async () => {
    ExchangeRateCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetExchangeRateCase.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: exchange workspace`,
      capabilities: [`exchange.read`, `exchange.manage`],
      workspaces: [`exchange`],
    });
    mockedGetExchangeRateCase.mockResolvedValue(buildRateCase());
  });

  it(`renders approval workflow and stale-rate truth without inventing extra actions`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeRateCasePage({
        params: Promise.resolve({ rateId: `rate-1` }),
      }),
    );

    expect(mockedGetExchangeRateCase).toHaveBeenCalledWith(`rate-1`);
    expect(markup).toContain(`Approval pending`);
    expect(markup).toContain(`Approve exchange rate`);
    expect(markup).toContain(`Mandatory approval reason for audit`);
    expect(markup).toContain(`Stale`);
    expect(markup).not.toContain(`Disable rate`);
    expect(markup).not.toContain(`Delete rate`);
  });

  it(`delegates missing rate records to notFound`, async () => {
    mockedGetExchangeRateCase.mockResolvedValueOnce(null);

    await expect(
      ExchangeRateCasePage({
        params: Promise.resolve({ rateId: `missing-rate` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
