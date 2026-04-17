import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: jest.fn(() => {
    throw new Error(`NEXT_NOT_FOUND`);
  }),
}));

jest.mock(`../../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getExchangeScheduledCase: jest.fn(),
}));

jest.mock(`../../../../../lib/admin-mutations.server`, () => ({
  cancelScheduledExchangeAction: jest.fn(),
  forceExecuteScheduledExchangeAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getExchangeScheduledCase: mockedGetExchangeScheduledCase } =
  jest.requireMock(`../../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeScheduledCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildScheduledCase() {
  return {
    id: `scheduled-1`,
    consumer: {
      id: `consumer-1`,
      email: `consumer@example.com`,
    },
    core: {
      id: `scheduled-1`,
      sourceCurrency: `USD`,
      targetCurrency: `EUR`,
      amount: `42.00`,
      status: `FAILED`,
      attempts: 2,
      executeAt: `2026-04-17T10:00:00.000Z`,
      processingAt: `2026-04-17T10:02:00.000Z`,
      executedAt: null,
      failedAt: `2026-04-17T10:03:00.000Z`,
      createdAt: `2026-04-17T09:00:00.000Z`,
      updatedAt: `2026-04-17T10:03:00.000Z`,
    },
    failureDetail: `RATE_STALE`,
    linkedRuleId: `rule-1`,
    linkedLedgerEntries: [],
    actionControls: {
      canForceExecute: true,
      canCancel: false,
      allowedActions: [`exchange_scheduled_force_execute`],
    },
    version: 1713348180000,
    updatedAt: `2026-04-17T10:03:00.000Z`,
    staleWarning: false,
    dataFreshnessClass: `exact`,
  };
}

describe(`admin-v2 scheduled fx case`, () => {
  beforeAll(async () => {
    ExchangeScheduledCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetExchangeScheduledCase.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: exchange workspace`,
      capabilities: [`exchange.read`, `exchange.manage`],
      workspaces: [`exchange`],
    });
    mockedGetExchangeScheduledCase.mockResolvedValue(buildScheduledCase());
  });

  it(`renders only canonical scheduled actions and linked exchange context`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeScheduledCasePage({
        params: Promise.resolve({ conversionId: `scheduled-1` }),
      }),
    );

    expect(mockedGetExchangeScheduledCase).toHaveBeenCalledWith(`scheduled-1`);
    expect(markup).toContain(`Force execute scheduled conversion`);
    expect(markup).toContain(`Source amount: 42.00 USD`);
    expect(markup).toContain(`/exchange/rules/rule-1`);
    expect(markup).toContain(`RATE_STALE`);
    expect(markup).not.toContain(`Retry automatically`);
    expect(markup).not.toContain(`Pause queue`);
  });
});
