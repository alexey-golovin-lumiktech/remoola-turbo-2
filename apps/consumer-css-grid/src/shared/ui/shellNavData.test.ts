import { describe, expect, it } from '@jest/globals';

import { mobileNavHrefs, sidebarHrefs } from './shellNavData';
import { isCommandRouteHref, matchCommandRoutes } from '../../app/(shell)/commandPaletteRoutes';

// All primary routes under app/(shell)/ — update when adding new shell routes.
const SHELL_ROUTES = [
  `/banking`,
  `/contacts`,
  `/contracts`,
  `/dashboard`,
  `/documents`,
  `/exchange`,
  `/help`,
  `/payments`,
  `/settings`,
  `/withdraw`,
] as const;

// Routes intentionally excluded from mobile bottom nav (limited to 6 slots).
const MOBILE_NAV_EXCLUDED = new Set([`/banking`, `/documents`, `/help`, `/withdraw`]);

describe(`shellNavData coverage`, () => {
  it(`sidebarHrefs covers every shell route`, () => {
    const covered = new Set<string>(sidebarHrefs);
    const missing = SHELL_ROUTES.filter((route) => !covered.has(route));
    expect(missing).toEqual([]);
  });

  it(`mobileNavHrefs covers non-excluded shell routes`, () => {
    const covered = new Set<string>(mobileNavHrefs);
    const missing = SHELL_ROUTES.filter((route) => !MOBILE_NAV_EXCLUDED.has(route) && !covered.has(route));
    expect(missing).toEqual([]);
  });

  it(`sidebar routes are available in command palette`, () => {
    const missing = sidebarHrefs.filter((route) => !isCommandRouteHref(route));
    expect(missing).toEqual([]);
  });

  it(`help is discoverable through command palette search`, () => {
    const matches = matchCommandRoutes(`help`).map((route) => route.href);
    expect(matches).toContain(`/help`);
  });
});
