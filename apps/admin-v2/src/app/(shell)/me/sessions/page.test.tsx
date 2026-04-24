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
  getMyAdminSessionsResult: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  revokeMyAdminSessionAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getMyAdminSessionsResult: mockedGetMyAdminSessionsResult } =
  jest.requireMock(`../../../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

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
    mockedGetMyAdminSessionsResult.mockReset();
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

  it(`renders the empty state and no revoke forms when there are no sessions`, async () => {
    mockedGetMyAdminSessionsResult.mockResolvedValue({ status: `ready`, data: { sessions: [] } });
    const markup = renderToStaticMarkup(await MySessionsPage());
    expect(mockedGetMyAdminSessionsResult).toHaveBeenCalled();
    expect(markup).toContain(`No sessions visible`);
    expect(markup).not.toContain(`name="sessionId"`);
  });

  it(`adds the unavailable banner when the BFF returns an error state and falls back to an empty list`, async () => {
    mockedGetMyAdminSessionsResult.mockResolvedValue({ status: `error` });
    const markup = renderToStaticMarkup(await MySessionsPage());
    expect(mockedGetMyAdminSessionsResult).toHaveBeenCalled();
    expect(markup).toContain(`Sessions surface temporarily unavailable`);
    expect(markup).toContain(`No sessions visible`);
  });

  it(`shows a denied banner when the sessions surface returns forbidden`, async () => {
    mockedGetMyAdminSessionsResult.mockResolvedValue({ status: `forbidden` });
    const markup = renderToStaticMarkup(await MySessionsPage());
    expect(mockedGetMyAdminSessionsResult).toHaveBeenCalled();
    expect(markup).toContain(`Session visibility is denied`);
  });
});
