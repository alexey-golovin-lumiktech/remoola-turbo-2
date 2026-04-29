import { RECENT_ROUTES_LIMIT, isCommandRouteHref } from './commandPaletteRoutes';

export const RECENT_ROUTES_STORAGE_KEY = `consumer-css-grid-command-palette-recent`;

export function parseRecentRouteHrefs(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((href): href is string => typeof href === `string` && isCommandRouteHref(href))
      .slice(0, RECENT_ROUTES_LIMIT);
  } catch {
    return [];
  }
}

export function createRecentRouteHrefs(current: string[], href: string): string[] {
  return [href, ...current.filter((existingHref) => existingHref !== href)].slice(0, RECENT_ROUTES_LIMIT);
}

export function serializeRecentRouteHrefs(hrefs: string[]): string {
  return JSON.stringify(hrefs.slice(0, RECENT_ROUTES_LIMIT));
}
