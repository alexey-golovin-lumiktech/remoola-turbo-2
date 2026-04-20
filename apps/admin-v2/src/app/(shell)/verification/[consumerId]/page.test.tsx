import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: () => {
    throw new Error(`notFound called`);
  },
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getAdmins: jest.fn(),
  getVerificationCase: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  approveVerificationAction: jest.fn(async () => undefined),
  claimVerificationAssignmentAction: jest.fn(async () => undefined),
  flagVerificationAction: jest.fn(async () => undefined),
  forceLogoutConsumerAction: jest.fn(async () => undefined),
  reassignVerificationAssignmentAction: jest.fn(async () => undefined),
  rejectVerificationAction: jest.fn(async () => undefined),
  releaseVerificationAssignmentAction: jest.fn(async () => undefined),
  requestInfoVerificationAction: jest.fn(async () => undefined),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getAdmins: mockedGetAdmins,
  getVerificationCase: mockedGetVerificationCase,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let VerificationCasePage: Awaited<ReturnType<typeof loadSubject>>;

type VerificationCase = NonNullable<Awaited<ReturnType<typeof AdminApi.getVerificationCase>>>;

const EMPTY_CONSUMER_BASE = {
  accountType: `PERSONAL`,
  contractorKind: null,
  verified: null,
  legalVerified: null,
  verificationReason: null,
  verificationUpdatedAt: `2026-04-20T10:00:00.000Z`,
  suspendedAt: null,
  suspendedBy: null,
  suspensionReason: null,
  stripeIdentityStatus: null,
  stripeIdentityLastErrorCode: null,
  stripeIdentityLastErrorReason: null,
  stripeIdentityStartedAt: null,
  stripeIdentityUpdatedAt: null,
  stripeIdentityVerifiedAt: null,
  createdAt: `2026-04-20T08:00:00.000Z`,
  updatedAt: `2026-04-20T10:00:00.000Z`,
  deletedAt: null,
  personalDetails: null,
  organizationDetails: null,
  addressDetails: null,
  googleProfileDetails: null,
  contacts: [],
  paymentMethods: [],
  recentPaymentRequests: [],
  ledgerSummary: {},
  consumerResources: [],
  adminNotes: [],
  adminFlags: [],
  _count: {
    contacts: 0,
    paymentMethods: 0,
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
};

function buildCase(overrides: {
  assignment: VerificationCase[`assignment`];
  decisionControls: VerificationCase[`decisionControls`];
}): VerificationCase {
  return {
    id: `consumer-1`,
    email: `user@example.com`,
    verificationStatus: `PENDING`,
    version: Date.parse(`2026-04-20T10:00:00.000Z`),
    decisionHistory: [],
    authRisk: { loginFailures24h: 0, refreshReuse30d: 0, recentEvents: [] },
    verificationSla: { breached: false, thresholdHours: 24, lastComputedAt: null },
    ...EMPTY_CONSUMER_BASE,
    ...overrides,
  };
}

function baseControls(
  overrides: Partial<VerificationCase[`decisionControls`]> = {},
): VerificationCase[`decisionControls`] {
  return {
    canForceLogout: false,
    canDecide: false,
    allowedActions: [],
    canManageAssignments: false,
    canReassignAssignments: false,
    ...overrides,
  };
}

const CURRENT_ADMIN_IDENTITY = {
  id: `admin-self`,
  email: `self@example.com`,
  type: `ADMIN`,
  role: `OPS_ADMIN`,
  phase: `MVP-3`,
  capabilities: [`assignments.manage`],
  workspaces: [`verification`],
};

const OTHER_ADMIN_IDENTITY = {
  ...CURRENT_ADMIN_IDENTITY,
  id: `admin-other-reader`,
  email: `other@example.com`,
};

describe(`admin-v2 verification case assignment card`, () => {
  beforeAll(async () => {
    VerificationCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetAdmins.mockReset();
    mockedGetVerificationCase.mockReset();
    mockedGetAdmins.mockResolvedValue({
      items: [
        {
          id: `admin-candidate-1`,
          email: `candidate1@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          status: `ACTIVE`,
          lastActivityAt: null,
          createdAt: `2026-04-01T00:00:00.000Z`,
          updatedAt: `2026-04-01T00:00:00.000Z`,
          deletedAt: null,
        },
      ],
      pendingInvitations: [],
      total: 1,
      page: 1,
      pageSize: 50,
    });
  });

  it(`renders unassigned state with an enabled Claim button for managers`, async () => {
    mockedGetAdminIdentity.mockResolvedValue(CURRENT_ADMIN_IDENTITY);
    mockedGetVerificationCase.mockResolvedValue(
      buildCase({
        assignment: { current: null, history: [] },
        decisionControls: baseControls({ canManageAssignments: true }),
      }),
    );

    const markup = renderToStaticMarkup(
      await VerificationCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`Unassigned`);
    expect(markup).toContain(`>Claim<`);
    expect(markup).not.toContain(`>Claim</button><!-- -->`);
    expect(markup).not.toMatch(/>Claim<\/button>[\s\S]{0,50}disabled/);
    expect(markup).not.toContain(`>Reassign<`);
  });

  it(`renders an assigned-to-self state with an enabled Release button`, async () => {
    mockedGetAdminIdentity.mockResolvedValue(CURRENT_ADMIN_IDENTITY);
    mockedGetVerificationCase.mockResolvedValue(
      buildCase({
        assignment: {
          current: {
            id: `assignment-self`,
            assignedTo: { id: CURRENT_ADMIN_IDENTITY.id, name: null, email: CURRENT_ADMIN_IDENTITY.email },
            assignedBy: { id: CURRENT_ADMIN_IDENTITY.id, name: null, email: CURRENT_ADMIN_IDENTITY.email },
            assignedAt: `2026-04-20T10:00:00.000Z`,
            reason: null,
            expiresAt: null,
          },
          history: [],
        },
        decisionControls: baseControls({ canManageAssignments: true }),
      }),
    );

    const markup = renderToStaticMarkup(
      await VerificationCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`Currently assigned to:`);
    expect(markup).toContain(`self@example.com`);
    expect(markup).toContain(`>Release<`);
    expect(markup).not.toContain(`>Reassign<`);
    expect(markup).not.toContain(`>Claim<`);
  });

  it(`renders a reassign picker for super-admins when assignment belongs to someone else`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      ...CURRENT_ADMIN_IDENTITY,
      id: `admin-super`,
      email: `super@example.com`,
      role: `SUPER_ADMIN`,
    });
    mockedGetVerificationCase.mockResolvedValue(
      buildCase({
        assignment: {
          current: {
            id: `assignment-other`,
            assignedTo: { id: `admin-other-owner`, name: null, email: `otherowner@example.com` },
            assignedBy: { id: `admin-other-owner`, name: null, email: `otherowner@example.com` },
            assignedAt: `2026-04-20T10:00:00.000Z`,
            reason: `Taken earlier`,
            expiresAt: null,
          },
          history: [],
        },
        decisionControls: baseControls({ canManageAssignments: true, canReassignAssignments: true }),
      }),
    );

    const markup = renderToStaticMarkup(
      await VerificationCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`>Reassign<`);
    expect(markup).toContain(`candidate1@example.com`);
    expect(markup).toContain(`>Release<`);
    expect(mockedGetAdmins).toHaveBeenCalled();
  });

  it(`disables claim and release for admins without the assignments.manage capability`, async () => {
    mockedGetAdminIdentity.mockResolvedValue(OTHER_ADMIN_IDENTITY);
    mockedGetVerificationCase.mockResolvedValue(
      buildCase({
        assignment: { current: null, history: [] },
        decisionControls: baseControls({ canManageAssignments: false }),
      }),
    );

    const markup = renderToStaticMarkup(
      await VerificationCasePage({ params: Promise.resolve({ consumerId: `consumer-1` }) }),
    );

    expect(markup).toContain(`Unassigned`);
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Claim<\/button>/);
    expect(markup).not.toContain(`>Reassign<`);
  });
});
