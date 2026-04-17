import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getConsumerActionLog: jest.fn(),
  getConsumerAuthHistory: jest.fn(),
  getConsumerCase: jest.fn(),
  getConsumerContracts: jest.fn(),
  getConsumerLedgerSummary: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  addConsumerFlagAction: jest.fn(async () => undefined),
  createConsumerNoteAction: jest.fn(async () => undefined),
  forceLogoutConsumerAction: jest.fn(async () => undefined),
  removeConsumerFlagAction: jest.fn(async () => undefined),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getConsumerActionLog: mockedGetConsumerActionLog,
  getConsumerAuthHistory: mockedGetConsumerAuthHistory,
  getConsumerCase: mockedGetConsumerCase,
  getConsumerContracts: mockedGetConsumerContracts,
  getConsumerLedgerSummary: mockedGetConsumerLedgerSummary,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ConsumerCasePage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 consumer case payment-method bridge`, () => {
  beforeAll(async () => {
    ConsumerCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetConsumerActionLog.mockReset();
    mockedGetConsumerAuthHistory.mockReset();
    mockedGetConsumerCase.mockReset();
    mockedGetConsumerContracts.mockReset();
    mockedGetConsumerLedgerSummary.mockReset();

    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-2 slice: payouts.read`,
      capabilities: [`consumers.read`, `payment_methods.read`],
      workspaces: [`consumers`, `payment_methods`],
    });
    mockedGetConsumerCase.mockResolvedValue({
      id: `consumer-1`,
      email: `owner@example.com`,
      accountType: `BUSINESS`,
      contractorKind: `ENTITY`,
      verified: true,
      legalVerified: true,
      verificationStatus: `APPROVED`,
      verificationReason: null,
      verificationUpdatedAt: `2026-04-16T08:00:00.000Z`,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
      stripeIdentityStatus: `verified`,
      stripeIdentityLastErrorCode: null,
      stripeIdentityLastErrorReason: null,
      stripeIdentityStartedAt: `2026-04-15T08:00:00.000Z`,
      stripeIdentityUpdatedAt: `2026-04-16T08:00:00.000Z`,
      stripeIdentityVerifiedAt: `2026-04-16T08:00:00.000Z`,
      createdAt: `2026-04-01T08:00:00.000Z`,
      updatedAt: `2026-04-16T09:00:00.000Z`,
      deletedAt: null,
      personalDetails: null,
      organizationDetails: null,
      addressDetails: null,
      googleProfileDetails: null,
      contacts: [],
      paymentMethods: [
        {
          id: `pm-1`,
          type: `CREDIT_CARD`,
          brand: `Visa`,
          last4: `4242`,
          status: `DISABLED`,
          defaultSelected: true,
          createdAt: `2026-04-16T08:00:00.000Z`,
          updatedAt: `2026-04-16T09:00:00.000Z`,
          disabledAt: `2026-04-16T10:00:00.000Z`,
        },
      ],
      recentPaymentRequests: [],
      ledgerSummary: {},
      consumerResources: [],
      adminNotes: [],
      adminFlags: [],
      _count: {
        contacts: 0,
        paymentMethods: 1,
        asPayerPaymentRequests: 0,
        asRequesterPaymentRequests: 0,
        ledgerEntries: 0,
        consumerResources: 0,
        adminNotes: 0,
        adminFlags: 0,
      },
      recentAuthEvents: [],
      recentAdminActions: [],
      recentConsumerActions: [],
    });
    mockedGetConsumerContracts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });
    mockedGetConsumerLedgerSummary.mockResolvedValue({
      consumerId: `consumer-1`,
      summary: {},
    });
    mockedGetConsumerAuthHistory.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });
    mockedGetConsumerActionLog.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });
  });

  it(`renders only the read bridge into payment-method investigation from consumer case`, async () => {
    const markup = renderToStaticMarkup(
      await ConsumerCasePage({
        params: Promise.resolve({ consumerId: `consumer-1` }),
      }),
    );

    expect(markup).toContain(`Read-only bridge into the payment-method investigation surface.`);
    expect(markup).toContain(`/payment-methods?consumerId=consumer-1&amp;includeDeleted=true`);
    expect(markup).toContain(`/payment-methods/pm-1`);
    expect(markup).toContain(`Default: Yes`);
    expect(markup).toContain(`Status: DISABLED`);
  });
});
