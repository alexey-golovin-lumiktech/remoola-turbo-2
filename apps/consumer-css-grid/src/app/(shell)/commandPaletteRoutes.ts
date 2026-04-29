type CommandSectionTitle = `Pages` | `Actions` | `Recent` | `Suggested`;
type CommandGroup = Extract<CommandSectionTitle, `Pages` | `Actions`>;

interface CommandRoute {
  label: string;
  href: string;
  keywords: string[];
  group: CommandGroup;
}

interface IndexedCommandRoute extends CommandRoute {
  index: number;
}

interface CommandSection {
  title: CommandSectionTitle;
  routes: IndexedCommandRoute[];
}

interface HighlightedTextPart {
  text: string;
  matched: boolean;
}

const COMMAND_ROUTES: CommandRoute[] = [
  { label: `Dashboard`, href: `/dashboard`, keywords: [`home`, `overview`, `summary`], group: `Pages` },
  { label: `Payments`, href: `/payments`, keywords: [`pay`, `transaction`, `invoice`], group: `Pages` },
  { label: `Contracts`, href: `/contracts`, keywords: [`agreement`, `contract`, `contractor`], group: `Pages` },
  { label: `Documents`, href: `/documents`, keywords: [`file`, `upload`, `doc`], group: `Pages` },
  { label: `Contacts`, href: `/contacts`, keywords: [`people`, `recipient`, `client`], group: `Pages` },
  {
    label: `Bank & Cards`,
    href: `/banking`,
    keywords: [`bank`, `card`, `payment method`, `stripe`],
    group: `Pages`,
  },
  { label: `Withdraw`, href: `/withdraw`, keywords: [`withdraw`, `transfer`, `send money`], group: `Pages` },
  { label: `Exchange`, href: `/exchange`, keywords: [`fx`, `currency`, `convert`, `rate`], group: `Pages` },
  {
    label: `Exchange Rules`,
    href: `/exchange/rules`,
    keywords: [`rules`, `auto`, `conversion`],
    group: `Pages`,
  },
  {
    label: `Scheduled Conversions`,
    href: `/exchange/scheduled`,
    keywords: [`scheduled`, `planned`, `conversion`],
    group: `Pages`,
  },
  { label: `Settings`, href: `/settings`, keywords: [`profile`, `account`, `password`, `theme`], group: `Pages` },
  { label: `Start Payment`, href: `/payments/start`, keywords: [`new payment`, `pay now`, `start`], group: `Actions` },
  {
    label: `New Payment Request`,
    href: `/payments/new-request`,
    keywords: [`create request`, `invoice`, `request money`],
    group: `Actions`,
  },
];

const INDEXED_COMMAND_ROUTES: IndexedCommandRoute[] = COMMAND_ROUTES.map((route, index) => ({
  ...route,
  index,
}));
export const EMPTY_STATE_SUGGESTIONS = [`Dashboard`, `Payments`, `Exchange`, `Settings`] as const;
export const RECENT_ROUTES_LIMIT = 4;

const COMMAND_ROUTE_BY_HREF = new Map(INDEXED_COMMAND_ROUTES.map((route) => [route.href, route]));
const SUGGESTED_ROUTE_HREFS = [`/dashboard`, `/payments/start`, `/exchange`, `/settings`] as const;

export function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function getQueryTokens(query: string): string[] {
  return normalizeSearchValue(query).split(/\s+/).filter(Boolean);
}

export function isCommandRouteHref(href: string): boolean {
  return COMMAND_ROUTE_BY_HREF.has(href);
}

function getCommandRouteByHref(href: string): IndexedCommandRoute | undefined {
  return COMMAND_ROUTE_BY_HREF.get(href);
}

export function getCommandRoutesByHrefs(hrefs: string[]): IndexedCommandRoute[] {
  return hrefs
    .map((href) => getCommandRouteByHref(href))
    .filter((route): route is IndexedCommandRoute => route != null);
}

export function getSuggestedCommandRoutes(recentRouteHrefs: string[]): IndexedCommandRoute[] {
  return SUGGESTED_ROUTE_HREFS.map((href) => getCommandRouteByHref(href)).filter(
    (route): route is IndexedCommandRoute => route != null && !recentRouteHrefs.includes(route.href),
  );
}

export function isExactCommandRouteMatch(query: string, route: IndexedCommandRoute): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return false;
  }

  return [route.label, route.href].some((candidate) => normalizeSearchValue(candidate) === normalizedQuery);
}

function groupCommandRoutesByGroup(routes: IndexedCommandRoute[]): CommandSection[] {
  const groups = new Map<CommandGroup, IndexedCommandRoute[]>();

  for (const route of routes) {
    const existing = groups.get(route.group);
    if (existing) {
      existing.push(route);
    } else {
      groups.set(route.group, [route]);
    }
  }

  return Array.from(groups.entries()).map(([title, groupedRoutes]) => ({ title, routes: groupedRoutes }));
}

export function matchCommandRoutes(query: string): IndexedCommandRoute[] {
  const normalized = normalizeSearchValue(query);
  if (!normalized) {
    return INDEXED_COMMAND_ROUTES;
  }

  const tokens = getQueryTokens(normalized);

  return INDEXED_COMMAND_ROUTES.map((route) => {
    const label = route.label.toLowerCase();
    const keywords = route.keywords.join(` `).toLowerCase();
    const searchable = `${label} ${keywords} ${route.href.toLowerCase()}`;
    let score = 0;

    for (const token of tokens) {
      if (label.startsWith(token)) {
        score += 5;
        continue;
      }

      if (label.includes(token)) {
        score += 3;
        continue;
      }

      if (keywords.includes(token)) {
        score += 2;
        continue;
      }

      if (searchable.includes(token)) {
        score += 1;
        continue;
      }

      return null;
    }

    return { route, score };
  })
    .filter((entry): entry is { route: IndexedCommandRoute; score: number } => entry !== null)
    .sort((left, right) => right.score - left.score || left.route.index - right.route.index)
    .map(({ route }) => route);
}

export function buildCommandSections({
  filteredRoutes,
  queryTokens,
  recentRoutes,
  suggestedRoutes,
}: {
  filteredRoutes: IndexedCommandRoute[];
  queryTokens: string[];
  recentRoutes: IndexedCommandRoute[];
  suggestedRoutes: IndexedCommandRoute[];
}): CommandSection[] {
  if (queryTokens.length > 0) {
    return groupCommandRoutesByGroup(filteredRoutes);
  }

  const pinnedRouteHrefs = new Set<string>();
  const sections: CommandSection[] = [];

  if (recentRoutes.length > 0) {
    sections.push({ title: `Recent`, routes: recentRoutes });
    for (const route of recentRoutes) {
      pinnedRouteHrefs.add(route.href);
    }
  }

  if (suggestedRoutes.length > 0) {
    sections.push({ title: `Suggested`, routes: suggestedRoutes });
    for (const route of suggestedRoutes) {
      pinnedRouteHrefs.add(route.href);
    }
  }

  const remainingRoutes = filteredRoutes.filter((route) => !pinnedRouteHrefs.has(route.href));
  return [...sections, ...groupCommandRoutesByGroup(remainingRoutes)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
}

export function getHighlightedTextParts(text: string, tokens: string[]): HighlightedTextPart[] {
  if (tokens.length === 0) {
    return [{ text, matched: false }];
  }

  const uniqueTokens = Array.from(new Set(tokens)).sort((left, right) => right.length - left.length);
  if (uniqueTokens.length === 0) {
    return [{ text, matched: false }];
  }

  const matcher = new RegExp(`(${uniqueTokens.map(escapeRegExp).join(`|`)})`, `gi`);
  return text.split(matcher).map((part) => ({
    text: part,
    matched: uniqueTokens.some((token) => token.toLowerCase() === part.toLowerCase()),
  }));
}
