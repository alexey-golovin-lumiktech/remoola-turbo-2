import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../lib/admin-api.server';

jest.mock(`next/headers`, () => ({
  headers: jest.fn(async () => new Headers()),
}));

jest.mock(`./nav-state`, () => ({
  getActivePathFromHeaders: jest.fn(() => `/overview`),
}));

jest.mock(`../../components/mobile-bottom-nav`, () => ({
  MobileBottomNav: () => React.createElement(`div`, null, `mobile-bottom-nav`),
}));

jest.mock(`../../components/mobile-page-header`, () => ({
  MobilePageHeader: () => React.createElement(`div`, null, `mobile-page-header`),
}));

jest.mock(`../../components/mobile-shell-drawer`, () => ({
  MobileShellDrawer: ({ children }: { children: React.ReactNode }) => React.createElement(`div`, null, children),
}));

jest.mock(`../../components/mobile-top-chips`, () => ({
  MobileTopChips: () => React.createElement(`div`, null, `mobile-top-chips`),
}));

jest.mock(`../../components/shell-header`, () => ({
  ShellHeader: () => React.createElement(`div`, null, `shell-header`),
}));

jest.mock(`../../components/sidebar-contents`, () => ({
  SidebarContents: () => React.createElement(`div`, null, `sidebar-contents`),
}));

jest.mock(`../../lib/quickstart-investigations`, () => ({
  filterQuickstartsForWorkspaces: jest.fn((quickstarts) => quickstarts),
}));

jest.mock(`../../lib/admin-api.server`, () => ({
  getAdminIdentityResult: jest.fn(),
  getOverviewSummary: jest.fn(),
  getQuickstarts: jest.fn(),
}));

const {
  getAdminIdentityResult: mockedGetAdminIdentityResult,
  getOverviewSummary: mockedGetOverviewSummary,
  getQuickstarts: mockedGetQuickstarts,
} = jest.requireMock(`../../lib/admin-api.server`) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./layout`)).default;
}

let ShellLayout: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 shell layout read states`, () => {
  beforeAll(async () => {
    ShellLayout = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentityResult.mockReset();
    mockedGetOverviewSummary.mockReset();
    mockedGetQuickstarts.mockReset();
    mockedGetOverviewSummary.mockResolvedValue(null);
    mockedGetQuickstarts.mockResolvedValue([]);
  });

  it(`renders access denied for forbidden identity reads`, async () => {
    mockedGetAdminIdentityResult.mockResolvedValue({ status: `forbidden` });

    const markup = renderToStaticMarkup(
      await ShellLayout({ children: React.createElement(`div`, null, `child-surface`) }),
    );

    expect(markup).toContain(`Access denied`);
    expect(markup).toContain(`workspace allowlist`);
    expect(markup).not.toContain(`child-surface`);
  });

  it(`renders unavailable for backend errors instead of access denied`, async () => {
    mockedGetAdminIdentityResult.mockResolvedValue({ status: `error` });

    const markup = renderToStaticMarkup(
      await ShellLayout({ children: React.createElement(`div`, null, `child-surface`) }),
    );

    expect(markup).toContain(`Admin workspace unavailable`);
    expect(markup).toContain(`could not confirm backend access right now`);
    expect(markup).not.toContain(`child-surface`);
  });
});
