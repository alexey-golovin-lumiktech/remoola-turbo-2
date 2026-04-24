import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

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

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getAdminCaseRecordResult: jest.fn(),
  getAdminSessionsResult: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  changeAdminPermissionsAction: jest.fn(),
  changeAdminRoleAction: jest.fn(),
  deactivateAdminAction: jest.fn(),
  resetAdminPasswordAction: jest.fn(),
  restoreAdminAction: jest.fn(),
  revokeAdminSessionAction: jest.fn(),
}));

const {
  getAdminIdentity: mockedGetAdminIdentity,
  getAdminCaseRecordResult: mockedGetAdminCaseRecordResult,
  getAdminSessionsResult: mockedGetAdminSessionsResult,
} = jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let AdminCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildAdminRecord(): NonNullable<Awaited<ReturnType<typeof AdminApi.getAdminCaseRecord>>> {
  return {
    id: `admin-2`,
    core: {
      id: `admin-2`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      status: `ACTIVE`,
      createdAt: `2026-04-17T08:00:00.000Z`,
      deletedAt: null,
    },
    accessProfile: {
      source: `schema`,
      resolvedRole: `OPS_ADMIN`,
      capabilities: [`admins.read`],
      workspaces: [`admins`],
      schemaRoleKey: `OPS_ADMIN`,
      availablePermissionCapabilities: [`documents.manage`, `admins.read`, `admins.manage`],
      permissionOverrides: [{ capability: `admins.manage`, granted: false }],
    },
    settings: {
      id: `setting-1`,
      theme: `SYSTEM`,
      createdAt: `2026-04-17T08:00:00.000Z`,
      updatedAt: `2026-04-17T08:10:00.000Z`,
    },
    authoredNotesCount: 3,
    authoredFlagsCount: 1,
    recentAuditActions: [],
    recentAuthEvents: [],
    invitations: [],
    auditShortcuts: {
      adminActionsHref: `/audit/admin-actions?adminId=admin-2`,
      authHref: `/audit/auth?email=ops%40example.com`,
    },
    version: 1713341400000,
    updatedAt: `2026-04-17T08:10:00.000Z`,
    staleWarning: false,
    dataFreshnessClass: `exact`,
  };
}

describe(`admin-v2 admin case`, () => {
  beforeAll(async () => {
    AdminCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetAdminCaseRecordResult.mockReset();
    mockedGetAdminSessionsResult.mockReset();
    mockedGetAdminSessionsResult.mockResolvedValue({
      status: `ready`,
      data: {
        sessions: [
          {
            id: `session-active`,
            sessionFamilyId: `family-active`,
            createdAt: `2026-04-19T08:00:00.000Z`,
            lastUsedAt: `2026-04-21T08:00:00.000Z`,
            expiresAt: `2026-05-19T08:00:00.000Z`,
            revokedAt: null,
            invalidatedReason: null,
            replacedById: null,
          },
          {
            id: `session-revoked`,
            sessionFamilyId: `family-revoked`,
            createdAt: `2026-04-10T08:00:00.000Z`,
            lastUsedAt: `2026-04-11T08:00:00.000Z`,
            expiresAt: `2026-05-10T08:00:00.000Z`,
            revokedAt: `2026-04-12T08:00:00.000Z`,
            invalidatedReason: `cross_admin_revoked`,
            replacedById: null,
          },
        ],
      },
    });
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: admins and documents workspaces`,
      capabilities: [`admins.read`, `admins.manage`],
      workspaces: [`admins`],
    });
    mockedGetAdminCaseRecordResult.mockResolvedValue({
      status: `ready`,
      data: {
        id: `admin-2`,
        core: {
          id: `admin-2`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          status: `ACTIVE`,
          createdAt: `2026-04-17T08:00:00.000Z`,
          deletedAt: null,
        },
        accessProfile: {
          source: `schema`,
          resolvedRole: `OPS_ADMIN`,
          capabilities: [`admins.read`],
          workspaces: [`admins`],
          schemaRoleKey: `OPS_ADMIN`,
          availablePermissionCapabilities: [`documents.manage`, `admins.read`, `admins.manage`],
          permissionOverrides: [{ capability: `admins.manage`, granted: false }],
        },
        settings: {
          id: `setting-1`,
          theme: `SYSTEM`,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:10:00.000Z`,
        },
        authoredNotesCount: 3,
        authoredFlagsCount: 1,
        recentAuditActions: [
          {
            id: `audit-1`,
            action: `admin_role_change`,
            resource: `admin`,
            resourceId: `admin-2`,
            metadata: { previousRoleKey: `OPS_ADMIN`, nextRoleKey: `SUPER_ADMIN` },
            actorEmail: `super@example.com`,
            createdAt: `2026-04-17T08:30:00.000Z`,
          },
        ],
        recentAuthEvents: [
          {
            id: `auth-1`,
            event: `login`,
            ipAddress: `127.0.0.1`,
            userAgent: `jest`,
            createdAt: `2026-04-17T08:20:00.000Z`,
          },
        ],
        invitations: [
          {
            id: `inv-1`,
            email: `ops@example.com`,
            role: `OPS_ADMIN`,
            status: `accepted`,
            expiresAt: `2026-04-24T08:00:00.000Z`,
            acceptedAt: `2026-04-18T08:00:00.000Z`,
            createdAt: `2026-04-17T08:00:00.000Z`,
          },
        ],
        auditShortcuts: {
          adminActionsHref: `/audit/admin-actions?adminId=admin-2`,
          authHref: `/audit/auth?email=ops%40example.com`,
        },
        version: 1713341400000,
        updatedAt: `2026-04-17T08:10:00.000Z`,
        staleWarning: false,
        dataFreshnessClass: `exact`,
      },
    });
  });

  it(`loads self sessions but hides cross-admin revoke controls on the self case`, async () => {
    const selfRecord = buildAdminRecord();
    selfRecord.id = `admin-1`;
    selfRecord.core = {
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      status: `ACTIVE`,
      createdAt: `2026-04-17T08:00:00.000Z`,
      deletedAt: null,
    };
    mockedGetAdminCaseRecordResult.mockResolvedValueOnce({ status: `ready`, data: selfRecord });

    const markup = renderToStaticMarkup(
      await AdminCasePage({
        params: Promise.resolve({ adminId: `admin-1` }),
      }),
    );

    expect(mockedGetAdminSessionsResult).toHaveBeenCalledWith(`admin-1`);
    expect(markup).toContain(`Active sessions`);
    expect(markup).toContain(`session-active`);
    expect(markup).not.toContain(`Revoke session`);
    expect(markup).toContain(`Use My sessions for self-revoke`);
  });

  it(`skips the session lookup entirely when admins.read is unavailable`, async () => {
    mockedGetAdminIdentity.mockResolvedValueOnce({
      id: `admin-1`,
      email: `support@example.com`,
      type: `ADMIN`,
      role: `SUPPORT_ADMIN`,
      phase: `MVP-3.5d`,
      capabilities: [`me.read`],
      workspaces: [`overview`],
    });

    const markup = renderToStaticMarkup(
      await AdminCasePage({
        params: Promise.resolve({ adminId: `admin-2` }),
      }),
    );

    expect(mockedGetAdminSessionsResult).not.toHaveBeenCalled();
    expect(markup).not.toContain(`Active sessions`);
  });

  it(`delegates missing admin records to notFound`, async () => {
    mockedGetAdminCaseRecordResult.mockResolvedValueOnce({ status: `not_found` });

    await expect(
      AdminCasePage({
        params: Promise.resolve({ adminId: `missing-admin` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it(`renders an access denied surface for forbidden admin reads`, async () => {
    mockedGetAdminCaseRecordResult.mockResolvedValueOnce({ status: `forbidden` });

    const markup = renderToStaticMarkup(
      await AdminCasePage({
        params: Promise.resolve({ adminId: `admin-2` }),
      }),
    );

    expect(markup).toContain(`Admin case unavailable`);
    expect(markup).toContain(`cannot access this admin surface`);
  });
});
