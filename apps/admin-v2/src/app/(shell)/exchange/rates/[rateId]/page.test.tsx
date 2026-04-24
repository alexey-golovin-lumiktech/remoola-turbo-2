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
  getExchangeRateCaseResult: jest.fn(),
}));

jest.mock(`../../../../../lib/admin-mutations.server`, () => ({
  approveExchangeRateAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getExchangeRateCaseResult: mockedGetExchangeRateCaseResult } =
  jest.requireMock(`../../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

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
    mockedGetExchangeRateCaseResult.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `exchange workspace`,
      capabilities: [`exchange.read`, `exchange.manage`],
      workspaces: [`exchange`],
    });
    mockedGetExchangeRateCaseResult.mockResolvedValue({ status: `ready`, data: buildRateCase() });
  });

  it(`delegates missing rate records to notFound`, async () => {
    mockedGetExchangeRateCaseResult.mockResolvedValueOnce({ status: `not_found` });

    await expect(
      ExchangeRateCasePage({
        params: Promise.resolve({ rateId: `missing-rate` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it(`renders an access denied surface for forbidden exchange-rate reads`, async () => {
    mockedGetExchangeRateCaseResult.mockResolvedValueOnce({ status: `forbidden` });

    const markup = renderToStaticMarkup(
      await ExchangeRateCasePage({
        params: Promise.resolve({ rateId: `rate-1` }),
      }),
    );

    expect(markup).toContain(`Exchange rate unavailable`);
    expect(markup).toContain(`cannot access this exchange-rate surface`);
  });
});
