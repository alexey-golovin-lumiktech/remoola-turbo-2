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
  getMyAdminSessions: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  revokeMyAdminSessionAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getMyAdminSessions: mockedGetMyAdminSessions } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let MySessionsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 /me/sessions page`, () => {
  beforeAll(async () => {
    MySessionsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetMyAdminSessions.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `admin@example.com`,
      role: `SUPER_ADMIN`,
      capabilities: [`me.read`],
      workspaces: [`overview`],
      type: `SUPER`,
      phase: `MVP-3.5d`,
    } as never);
  });

  it(`renders three sessions, hides revoke form on current and on revoked, shows it on other active`, async () => {
    mockedGetMyAdminSessions.mockResolvedValue({
      sessions: [
        {
          id: `session-current`,
          sessionFamilyId: `family-current`,
          createdAt: `2026-04-21T11:00:00.000Z`,
          lastUsedAt: `2026-04-21T12:00:00.000Z`,
          expiresAt: `2026-05-21T11:00:00.000Z`,
          revokedAt: null,
          invalidatedReason: null,
          replacedById: null,
          current: true,
        },
        {
          id: `session-other-active`,
          sessionFamilyId: `family-other`,
          createdAt: `2026-04-20T11:00:00.000Z`,
          lastUsedAt: `2026-04-20T12:00:00.000Z`,
          expiresAt: `2026-05-20T11:00:00.000Z`,
          revokedAt: null,
          invalidatedReason: null,
          replacedById: null,
          current: false,
        },
        {
          id: `session-revoked`,
          sessionFamilyId: `family-revoked`,
          createdAt: `2026-04-01T11:00:00.000Z`,
          lastUsedAt: `2026-04-01T12:00:00.000Z`,
          expiresAt: `2026-05-01T11:00:00.000Z`,
          revokedAt: `2026-04-02T12:00:00.000Z`,
          invalidatedReason: `rotated`,
          replacedById: `session-other-active`,
          current: false,
        },
      ],
    });

    const markup = renderToStaticMarkup(await MySessionsPage());

    expect(markup).toContain(`session-current`);
    expect(markup).toContain(`session-other-active`);
    expect(markup).toContain(`session-revoked`);
    expect(markup).toContain(`Current`);
    expect(markup).toContain(`Active`);
    expect(markup).toContain(`rotated`);

    const revokeButtons = markup.match(/Revoke this session/g) ?? [];
    expect(revokeButtons.length).toBe(1);
    const otherActivePos = markup.indexOf(`session-other-active`);
    const revokeButtonPos = markup.indexOf(`Revoke this session`);
    const currentPos = markup.indexOf(`session-current`);
    const revokedPos = markup.indexOf(`session-revoked`);
    expect(revokeButtonPos).toBeGreaterThan(otherActivePos);
    expect(revokeButtonPos).toBeLessThan(revokedPos);
    expect(currentPos).toBeLessThan(revokeButtonPos);
  });

  it(`renders an empty state when there are no sessions`, async () => {
    mockedGetMyAdminSessions.mockResolvedValue({ sessions: [] });
    const markup = renderToStaticMarkup(await MySessionsPage());
    expect(markup).toContain(`No sessions visible`);
    expect(markup).not.toContain(`Revoke this session`);
  });

  it(`renders an unavailable banner when the BFF returns null`, async () => {
    mockedGetMyAdminSessions.mockResolvedValue(null);
    const markup = renderToStaticMarkup(await MySessionsPage());
    expect(markup).toContain(`Sessions surface temporarily unavailable`);
  });
});
