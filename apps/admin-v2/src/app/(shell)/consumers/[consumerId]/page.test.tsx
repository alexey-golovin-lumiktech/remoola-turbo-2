import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: () => {
    throw new Error(`NEXT_NOT_FOUND`);
  },
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getConsumerCaseResult: jest.fn(),
  getConsumerContracts: jest.fn(),
  getConsumerLedgerSummary: jest.fn(),
  getConsumerAuthHistory: jest.fn(),
  getConsumerActionLog: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  addConsumerFlagAction: jest.fn(),
  createConsumerNoteAction: jest.fn(),
  forceLogoutConsumerAction: jest.fn(),
  resendConsumerEmailAction: jest.fn(),
  removeConsumerFlagAction: jest.fn(),
  suspendConsumerAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getConsumerCaseResult: mockedGetConsumerCaseResult,
  getConsumerContracts: mockedGetConsumerContracts,
  getConsumerLedgerSummary: mockedGetConsumerLedgerSummary,
  getConsumerAuthHistory: mockedGetConsumerAuthHistory,
  getConsumerActionLog: mockedGetConsumerActionLog,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ConsumerCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildConsumerCase(): AdminApi.ConsumerCaseResponse {
  return {
    id: `consumer-1`,
    email: `consumer@example.com`,
    accountType: `PERSONAL`,
    verificationStatus: `PENDING`,
    contractorKind: null,
    verified: false,
    legalVerified: false,
    verificationReason: null,
    verificationUpdatedAt: `2026-04-20T10:00:00.000Z`,
    stripeIdentityStatus: null,
    stripeIdentityLastErrorCode: null,
    stripeIdentityLastErrorReason: null,
    stripeIdentityStartedAt: null,
    stripeIdentityUpdatedAt: null,
    stripeIdentityVerifiedAt: null,
    suspendedAt: null,
    suspendedBy: null,
    suspensionReason: null,
    createdAt: `2026-04-20T08:00:00.000Z`,
    updatedAt: `2026-04-20T10:00:00.000Z`,
    deletedAt: null,
    personalDetails: null,
    organizationDetails: null,
    addressDetails: null,
    googleProfileDetails: null,
    contacts: [],
    ledgerSummary: {},
    adminFlags: [
      {
        id: `flag-1`,
        flag: `needs_review`,
        reason: `Review requested`,
        version: 1,
        createdAt: `2026-04-20T09:00:00.000Z`,
        admin: { id: `admin-1`, email: `ops@example.com` },
      },
    ],
    adminNotes: [
      {
        id: `note-1`,
        content: `Existing note`,
        createdAt: `2026-04-20T09:30:00.000Z`,
        admin: { id: `admin-1`, email: `ops@example.com` },
      },
    ],
    _count: {
      adminNotes: 1,
      adminFlags: 1,
      contacts: 0,
      consumerResources: 0,
      paymentMethods: 0,
      asPayerPaymentRequests: 0,
      asRequesterPaymentRequests: 0,
      ledgerEntries: 0,
    },
    recentPaymentRequests: [],
    paymentMethods: [],
    consumerResources: [],
    recentAuthEvents: [],
    recentAdminActions: [],
    recentConsumerActions: [],
  };
}

describe(`admin-v2 consumer case capability gating`, () => {
  beforeAll(async () => {
    ConsumerCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetConsumerCaseResult.mockReset();
    mockedGetConsumerContracts.mockReset();
    mockedGetConsumerLedgerSummary.mockReset();
    mockedGetConsumerAuthHistory.mockReset();
    mockedGetConsumerActionLog.mockReset();

    mockedGetConsumerCaseResult.mockResolvedValue({ status: `ready`, data: buildConsumerCase() });
    mockedGetConsumerContracts.mockResolvedValue({ items: [] } as never);
    mockedGetConsumerLedgerSummary.mockResolvedValue({ summary: {} } as never);
    mockedGetConsumerAuthHistory.mockResolvedValue({ items: [] } as never);
    mockedGetConsumerActionLog.mockResolvedValue({ items: [] } as never);
  });

  it(`shows note and flag forms when the matching capabilities are present`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`consumers.notes`, `consumers.flags`],
      workspaces: [`consumers`],
    } as never);

    const markup = renderToStaticMarkup(
      await ConsumerCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`Save note`);
    expect(markup).toContain(`Add flag`);
    expect(markup).toContain(`>Remove<`);
  });

  it(`removes note and flag mutation affordances when the capabilities are absent`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-2`,
      email: `readonly@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`consumers.read`],
      workspaces: [`consumers`],
    } as never);

    const markup = renderToStaticMarkup(
      await ConsumerCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`Internal note creation is not available for this admin identity.`);
    expect(markup).toContain(`Consumer flag management is not available for this admin identity.`);
    expect(markup).not.toContain(`Save note`);
    expect(markup).not.toContain(`name="flag"`);
    expect(markup).not.toContain(`>Remove<`);
  });

  it(`uses the canonical consumer app scope for resend email actions`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-3`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3`,
      capabilities: [`consumers.read`, `consumers.email_resend`],
      workspaces: [`consumers`],
    } as never);

    const markup = renderToStaticMarkup(
      await ConsumerCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`name="emailKind" value="signup_verification"`);
    expect(markup).toContain(`name="emailKind" value="password_recovery"`);
    expect(markup).toContain(`name="appScope" value="${CURRENT_CONSUMER_APP_SCOPE}"`);
    expect(markup).not.toContain(`name="appScope" value="consumer"`);
  });
});
