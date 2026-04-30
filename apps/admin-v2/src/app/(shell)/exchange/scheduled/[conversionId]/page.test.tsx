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
  getAdmins: jest.fn(),
  getExchangeScheduledCaseResult: jest.fn(),
}));

jest.mock(`../../../../../lib/admin-mutations.server`, () => ({
  cancelScheduledExchangeAction: jest.fn(),
  claimFxConversionAssignmentAction: jest.fn(),
  forceExecuteScheduledExchangeAction: jest.fn(),
  reassignFxConversionAssignmentAction: jest.fn(),
  releaseFxConversionAssignmentAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getAdmins: mockedGetAdmins,
  getExchangeScheduledCaseResult: mockedGetExchangeScheduledCaseResult,
} = jest.requireMock(`../../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ExchangeScheduledCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildScheduledCase() {
  return {
    id: `conversion-1`,
    core: {
      status: `PENDING`,
      sourceCurrency: `USD`,
      targetCurrency: `EUR`,
      amount: `350.00`,
      attempts: 1,
      executeAt: `2026-04-17T10:00:00.000Z`,
      processingAt: null,
      executedAt: null,
      failedAt: null,
    },
    consumer: {
      id: `consumer-1`,
      email: `consumer@example.com`,
    },
    linkedRuleId: `rule-1`,
    linkedLedgerEntries: [],
    failureDetail: null,
    actionControls: {
      canForceExecute: true,
      canCancel: true,
    },
    assignment: {
      current: null,
      history: [],
    },
    version: 1713341100000,
    updatedAt: `2026-04-17T08:05:00.000Z`,
  };
}

describe(`admin-v2 scheduled exchange case`, () => {
  beforeAll(async () => {
    ExchangeScheduledCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetAdmins.mockReset();
    mockedGetExchangeScheduledCaseResult.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `exchange workspace`,
      capabilities: [`exchange.read`, `exchange.manage`, `assignments.manage`],
      workspaces: [`exchange`],
    });
    mockedGetAdmins.mockResolvedValue({
      items: [],
      pendingInvitations: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    mockedGetExchangeScheduledCaseResult.mockResolvedValue({ status: `ready`, data: buildScheduledCase() });
  });

  it(`renders password confirmation for protected scheduled actions`, async () => {
    const markup = renderToStaticMarkup(
      await ExchangeScheduledCasePage({
        params: Promise.resolve({ conversionId: `conversion-1` }),
      }),
    );

    expect(markup).toContain(`Force execute scheduled conversion`);
    expect(markup).toContain(`Cancel scheduled conversion`);
    expect(markup).toContain(`name="passwordConfirmation"`);
  });
});
