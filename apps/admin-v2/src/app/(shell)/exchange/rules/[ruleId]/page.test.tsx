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
  getExchangeRuleCaseResult: jest.fn(),
}));

jest.mock(`../../../../../lib/admin-mutations.server`, () => ({
  pauseExchangeRuleAction: jest.fn(),
  resumeExchangeRuleAction: jest.fn(),
  runExchangeRuleNowAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getExchangeRuleCaseResult: mockedGetExchangeRuleCaseResult } =
  jest.requireMock(`../../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeRuleCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildRuleCase() {
  return {
    id: `rule-1`,
    core: {
      id: `rule-1`,
      sourceCurrency: `USD`,
      targetCurrency: `EUR`,
      enabled: true,
      threshold: `2500.00`,
      maxConvertAmount: `1000.00`,
      minIntervalMinutes: 60,
      lastRunAt: `2026-04-17T08:00:00.000Z`,
      nextRunAt: `2026-04-17T09:00:00.000Z`,
      createdAt: `2026-04-16T08:00:00.000Z`,
    },
    consumer: {
      id: `consumer-1`,
      email: `consumer@example.com`,
    },
    lastExecution: { status: `success` },
    actionControls: {
      canPause: true,
      canResume: false,
      canRunNow: true,
    },
    version: 1713341100000,
    updatedAt: `2026-04-17T08:05:00.000Z`,
  };
}

describe(`admin-v2 exchange rule case`, () => {
  beforeAll(async () => {
    ExchangeRuleCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetExchangeRuleCaseResult.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `exchange workspace`,
      capabilities: [`exchange.read`, `exchange.manage`],
      workspaces: [`exchange`],
    });
    mockedGetExchangeRuleCaseResult.mockResolvedValue({ status: `ready`, data: buildRuleCase() });
  });

  it(`renders password confirmation for run-now actions`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeRuleCasePage({
        params: Promise.resolve({ ruleId: `rule-1` }),
      }),
    );

    expect(markup).toContain(`Run now`);
    expect(markup).toContain(`name="passwordConfirmation"`);
  });
});
