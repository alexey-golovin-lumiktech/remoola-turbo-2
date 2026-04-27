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

jest.mock(`../../components/mobile-shell-utility-bar`, () => ({
  MobileShellUtilityBar: () => React.createElement(`div`, null, `mobile-shell-utility-bar`),
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

  it(`keeps compact shell scaffolding below desktop breakpoint`, async () => {
    mockedGetAdminIdentityResult.mockResolvedValue({
      status: `ready`,
      data: {
        id: `admin-1`,
        email: `admin@example.com`,
        type: `SUPER_ADMIN`,
        role: `OPS_ADMIN`,
        phase: `workspace`,
        capabilities: [`admin.read`],
        workspaces: [`overview`, `consumers`, `payments`],
      },
    });

    const markup = renderToStaticMarkup(
      await ShellLayout({ children: React.createElement(`div`, null, `child-surface`) }),
    );

    expect(markup).toContain(
      `grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_28%),var(--bg)] lg:grid-cols-[296px_minmax(0,1fr)] xl:grid-cols-[336px_minmax(0,1fr)]`,
    );
    expect(markup).toContain(`hidden lg:flex`);
    expect(markup).toContain(`pb-24`);
    expect(markup).toContain(`mobile-bottom-nav`);
    expect(markup).toContain(`mobile-top-chips`);
    expect(markup).toContain(`mobile-page-header`);
    expect(markup).toContain(`mobile-shell-utility-bar`);
    expect(markup).toContain(`shell-header`);
    expect(markup).toContain(`child-surface`);
  });
});
