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
  getAdminCaseRecord: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  changeAdminPermissionsAction: jest.fn(),
  changeAdminRoleAction: jest.fn(),
  deactivateAdminAction: jest.fn(),
  resetAdminPasswordAction: jest.fn(),
  restoreAdminAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getAdminCaseRecord: mockedGetAdminCaseRecord } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let AdminCasePage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 admin case`, () => {
  beforeAll(async () => {
    AdminCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetAdminCaseRecord.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: admins and documents workspaces`,
      capabilities: [`admins.read`, `admins.manage`],
      workspaces: [`admins`],
    });
    mockedGetAdminCaseRecord.mockResolvedValue({
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
    });
  });

  it(`renders exact lifecycle actions and audit shortcuts without leaking system controls`, async () => {
    const markup = renderToStaticMarkup(
      await AdminCasePage({
        params: Promise.resolve({ adminId: `admin-2` }),
      }),
    );

    expect(mockedGetAdminCaseRecord).toHaveBeenCalledWith(`admin-2`);
    expect(markup).toContain(`Deactivate admin`);
    expect(markup).toContain(`Change role`);
    expect(markup).toContain(`Save overrides`);
    expect(markup).toContain(`SUPPORT_ADMIN`);
    expect(markup).toContain(`READONLY_ADMIN`);
    expect(markup).toContain(`inherit role baseline`);
    expect(markup).toContain(`documents.manage`);
    expect(markup).toContain(`Send password reset`);
    expect(markup).toContain(`href="/audit/admin-actions?adminId=admin-2"`);
    expect(markup).toContain(`admin_role_change`);
    expect(markup).not.toContain(`System`);
  });

  it(`delegates missing admin records to notFound`, async () => {
    mockedGetAdminCaseRecord.mockResolvedValueOnce(null);

    await expect(
      AdminCasePage({
        params: Promise.resolve({ adminId: `missing-admin` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
