import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getAdmins: jest.fn(),
}));

jest.mock(`../../../lib/admin-mutations.server`, () => ({
  inviteAdminAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getAdmins: mockedGetAdmins } = jest.requireMock(
  `../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let AdminsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 admins list`, () => {
  beforeAll(async () => {
    AdminsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetAdmins.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: admins and documents workspaces`,
      capabilities: [`admins.read`, `admins.manage`],
      workspaces: [`admins`],
    });
    mockedGetAdmins.mockResolvedValue({
      items: [
        {
          id: `admin-2`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          status: `ACTIVE`,
          lastActivityAt: `2026-04-17T09:00:00.000Z`,
          createdAt: `2026-04-17T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:10:00.000Z`,
          deletedAt: null,
        },
      ],
      pendingInvitations: [
        {
          id: `inv-1`,
          email: `invitee@example.com`,
          role: `OPS_ADMIN`,
          status: `pending`,
          expiresAt: `2026-04-24T08:00:00.000Z`,
          createdAt: `2026-04-17T08:05:00.000Z`,
          invitedBy: { id: `admin-1`, email: `super@example.com` },
        },
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    });
  });

  it(`renders exact admins workspace surfaces with invite form and pending invitations`, async () => {
    const markup = renderToStaticMarkup(
      await AdminsPage({
        searchParams: Promise.resolve({
          q: `ops`,
          status: `ACTIVE`,
          page: `2`,
        }),
      }),
    );

    expect(mockedGetAdmins).toHaveBeenCalledWith({
      page: 2,
      q: `ops`,
      status: `ACTIVE`,
    });
    expect(markup).toContain(`Send invitation`);
    expect(markup).toContain(`SUPPORT_ADMIN`);
    expect(markup).toContain(`RISK_ADMIN`);
    expect(markup).toContain(`FINANCE_ADMIN`);
    expect(markup).toContain(`READONLY_ADMIN`);
    expect(markup).toContain(`href="/admins/admin-2"`);
    expect(markup).toContain(`Pending invitations`);
    expect(markup).toContain(`invitee@example.com`);
    expect(markup).toContain(`href="/audit/admin-actions?action=admin_invite"`);
    expect(markup).not.toContain(`System`);
  });
});
