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
      phase: `admins workspace`,
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
          lastActivityAt: `2026-04-17T08:00:00.000Z`,
          createdAt: `2026-04-16T08:00:00.000Z`,
          updatedAt: `2026-04-17T08:05:00.000Z`,
          deletedAt: null,
        },
      ],
      pendingInvitations: [],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it(`renders password confirmation for invite admin form`, async () => {
    const markup = renderToStaticMarkup(
      await AdminsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Invite admin`);
    expect(markup).toContain(`name="passwordConfirmation"`);
    expect(markup).toContain(`type="password"`);
  });

  it(`hides invite form when admin manage capability is missing`, async () => {
    mockedGetAdminIdentity.mockResolvedValueOnce({
      id: `admin-1`,
      email: `readonly@example.com`,
      type: `ADMIN`,
      role: `READONLY_ADMIN`,
      phase: `admins workspace`,
      capabilities: [`admins.read`],
      workspaces: [`admins`],
    });

    const markup = renderToStaticMarkup(
      await AdminsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).not.toContain(`Invite admin`);
    expect(markup).not.toContain(`name="passwordConfirmation"`);
  });
});
