'use client';

import { useRouter } from 'next/navigation';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SearchIcon, cn } from '@remoola/ui';

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

const ROUTES: CommandRoute[] = [
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

const INDEXED_ROUTES: IndexedCommandRoute[] = ROUTES.map((route, index) => ({ ...route, index }));
const INDEXED_ROUTE_BY_HREF = new Map(INDEXED_ROUTES.map((route) => [route.href, route]));
const EMPTY_STATE_SUGGESTIONS = [`Dashboard`, `Payments`, `Exchange`, `Settings`] as const;
const SUGGESTED_ROUTE_HREFS = [`/dashboard`, `/payments/start`, `/exchange`, `/settings`] as const;
const RECENT_ROUTES_STORAGE_KEY = `consumer-css-grid-command-palette-recent`;
const RECENT_ROUTES_LIMIT = 4;

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function getQueryTokens(query: string): string[] {
  return normalizeSearchValue(query).split(/\s+/).filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
}

function highlightMatches(text: string, tokens: string[]): ReactNode {
  if (tokens.length === 0) {
    return text;
  }

  const uniqueTokens = Array.from(new Set(tokens)).sort((left, right) => right.length - left.length);
  if (uniqueTokens.length === 0) {
    return text;
  }

  const matcher = new RegExp(`(${uniqueTokens.map(escapeRegExp).join(`|`)})`, `gi`);
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    if (uniqueTokens.some((token) => token.toLowerCase() === part.toLowerCase())) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded-md bg-[var(--app-primary-soft)] px-1 py-0.5 text-[var(--app-primary)]"
        >
          {part}
        </mark>
      );
    }

    return part;
  });
}

function readRecentRouteHrefs(): string[] {
  if (typeof window === `undefined`) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((href): href is string => typeof href === `string` && INDEXED_ROUTE_BY_HREF.has(href))
      .slice(0, RECENT_ROUTES_LIMIT);
  } catch {
    return [];
  }
}

function isExactRouteMatch(query: string, route: IndexedCommandRoute): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return false;
  }

  return [route.label, route.href].some((candidate) => normalizeSearchValue(candidate) === normalizedQuery);
}

function groupRoutesByGroup(routes: IndexedCommandRoute[]): CommandSection[] {
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

function matchRoutes(query: string): IndexedCommandRoute[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) {
    return INDEXED_ROUTES;
  }

  const tokens = getQueryTokens(normalized);

  return INDEXED_ROUTES.map((route) => {
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

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState(``);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentRouteHrefs, setRecentRouteHrefs] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const queryTokens = useMemo(() => getQueryTokens(query), [query]);
  const normalizedQuery = useMemo(() => normalizeSearchValue(query), [query]);
  const filteredRoutes = useMemo(() => matchRoutes(query), [query]);
  const recentRoutes = useMemo(
    () =>
      recentRouteHrefs
        .map((href) => INDEXED_ROUTE_BY_HREF.get(href))
        .filter((route): route is IndexedCommandRoute => route != null),
    [recentRouteHrefs],
  );
  const suggestedRoutes = useMemo(
    () =>
      SUGGESTED_ROUTE_HREFS.map((href) => INDEXED_ROUTE_BY_HREF.get(href)).filter(
        (route): route is IndexedCommandRoute => route != null && !recentRouteHrefs.includes(route.href),
      ),
    [recentRouteHrefs],
  );
  const displaySections = useMemo(() => {
    if (queryTokens.length > 0) {
      return groupRoutesByGroup(filteredRoutes);
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
    return [...sections, ...groupRoutesByGroup(remainingRoutes)];
  }, [filteredRoutes, queryTokens.length, recentRoutes, suggestedRoutes]);
  const displayedRoutes = useMemo(() => displaySections.flatMap((section) => section.routes), [displaySections]);
  const routePositions = useMemo(
    () => new Map(displayedRoutes.map((route, index) => [route.href, index])),
    [displayedRoutes],
  );
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setRecentRouteHrefs(readRecentRouteHrefs());
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(displayedRoutes.length - 1, 0)));
  }, [displayedRoutes.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery(``);
    setActiveIndex(0);

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === `Escape`) {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener(`keydown`, handleEscape);
    return () => window.removeEventListener(`keydown`, handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const list = listRef.current;
    if (!list) {
      return;
    }

    const activeItem = list.querySelector<HTMLElement>(`[data-active="true"]`);
    activeItem?.scrollIntoView({ block: `nearest` });
  }, [activeIndex, open]);

  const rememberRecentRoute = useCallback((href: string) => {
    setRecentRouteHrefs((current) => {
      const next = [href, ...current.filter((existingHref) => existingHref !== href)].slice(0, RECENT_ROUTES_LIMIT);

      try {
        window.localStorage.setItem(RECENT_ROUTES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore restricted browser storage environments.
      }

      return next;
    });
  }, []);

  const clearRecentRoutes = useCallback(() => {
    setRecentRouteHrefs([]);

    try {
      window.localStorage.removeItem(RECENT_ROUTES_STORAGE_KEY);
    } catch {
      // Ignore restricted browser storage environments.
    }
  }, []);

  const navigate = useCallback(
    (href: string) => {
      rememberRecentRoute(href);
      router.push(href);
      onClose();
    },
    [onClose, rememberRecentRoute, router],
  );

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === `ArrowDown`) {
        event.preventDefault();
        setActiveIndex((current) => {
          if (displayedRoutes.length === 0) {
            return 0;
          }

          return Math.min(current + 1, displayedRoutes.length - 1);
        });
        return;
      }

      if (event.key === `ArrowUp`) {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === `Enter`) {
        event.preventDefault();
        const selectedRoute = displayedRoutes[activeIndexRef.current];
        if (selectedRoute) {
          navigate(selectedRoute.href);
        }
      }
    },
    [displayedRoutes, navigate],
  );
  const resultsLabel = displayedRoutes.length === 1 ? `1 result` : `${displayedRoutes.length} results`;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        `fixed inset-0 z-50 flex items-start justify-center p-3 pt-16 transition-opacity duration-200 sm:p-4 sm:pt-[12vh] md:p-6 md:pt-[14vh]`,
        open ? `pointer-events-auto opacity-100` : `pointer-events-none opacity-0`,
      )}
      data-testid="consumer-css-grid-command-palette"
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close command palette"
      />

      <div
        className={cn(
          `relative z-10 flex max-h-[min(82vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[var(--app-shadow)] transition-all duration-200 sm:rounded-[28px]`,
          open ? `translate-y-0 scale-100 opacity-100` : `translate-y-2 scale-[0.98] opacity-0`,
        )}
      >
        <div className="border-b border-[color:var(--app-border)] px-3 py-3 sm:px-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
              <SearchIcon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search pages and actions..."
                className="w-full bg-transparent text-sm font-medium text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                aria-label="Search pages and actions"
                aria-activedescendant={displayedRoutes[activeIndex] ? `command-palette-item-${activeIndex}` : undefined}
                autoComplete="off"
                spellCheck={false}
                tabIndex={open ? 0 : -1}
              />
              <div className="mt-1 text-xs text-[var(--app-text-faint)]">
                Jump to pages and quick actions without leaving the keyboard.
              </div>
            </div>
            <kbd className="rounded-md border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
              Esc
            </kbd>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--app-border)] px-3 py-2 text-xs sm:px-4 md:px-5">
          <span className="text-[var(--app-text-faint)]">
            {query ? `Results for “${query}”` : `Popular destinations and actions`}
          </span>
          <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 font-medium text-[var(--app-text-soft)]">
            {resultsLabel}
          </span>
        </div>

        <ul
          ref={listRef}
          className="max-h-[min(58vh,480px)] space-y-4 overflow-y-auto px-2 py-3 sm:max-h-[52vh] sm:px-3 md:px-4"
          role="listbox"
          aria-label="Search results"
        >
          {displayedRoutes.length === 0 ? (
            <li className="rounded-[24px] border border-dashed border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-6 text-center sm:px-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
                <SearchIcon size={18} aria-hidden="true" />
              </div>
              <div className="mt-4 text-sm font-medium text-[var(--app-text)]">
                Nothing found for &ldquo;{query}&rdquo;.
              </div>
              <div className="mt-2 text-sm text-[var(--app-text-muted)]">
                Try a page or action like Dashboard, Payments, Exchange, or Settings.
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                  <span
                    key={suggestion}
                    className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs text-[var(--app-text-soft)]"
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </li>
          ) : (
            displaySections.map(({ title, routes }) => (
              <li key={title} role="presentation">
                <div className="flex items-center justify-between gap-3 px-2 pb-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                    {title}
                  </p>
                  {title === `Recent` && routes.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearRecentRoutes}
                      className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <ul role="group" aria-label={title} className="space-y-1">
                  {routes.map((route) => {
                    const routeIndex = routePositions.get(route.href) ?? 0;
                    const isActive = activeIndex === routeIndex;
                    const exactMatch = isExactRouteMatch(normalizedQuery, route);
                    const showKeywords = queryTokens.length > 0 || title === `Recent` || title === `Suggested`;
                    const keywordsText = route.keywords.join(` · `);

                    return (
                      <li
                        key={route.href}
                        id={`command-palette-item-${routeIndex}`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <button
                          type="button"
                          data-active={isActive ? `true` : `false`}
                          className={cn(
                            `flex w-full items-center justify-between gap-4 rounded-[22px] border px-3 py-3.5 text-left transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out will-change-transform sm:px-4`,
                            isActive
                              ? `-translate-y-0.5 scale-[1.01] border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-text)] shadow-[var(--app-shadow)]`
                              : `border-transparent bg-[var(--app-surface-muted)] text-[var(--app-text-soft)] hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[color:var(--app-border)] hover:bg-[var(--app-surface)]`,
                          )}
                          onMouseEnter={() => setActiveIndex(routeIndex)}
                          onClick={() => navigate(route.href)}
                          tabIndex={-1}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{highlightMatches(route.label, queryTokens)}</div>
                            <div
                              className={cn(
                                `mt-1 truncate text-xs`,
                                isActive ? `text-[var(--app-primary)]` : `text-[var(--app-text-faint)]`,
                              )}
                            >
                              {highlightMatches(route.href, queryTokens)}
                            </div>
                            {showKeywords && keywordsText ? (
                              <div
                                className={cn(
                                  `mt-1 line-clamp-1 text-[11px]`,
                                  isActive ? `text-[var(--app-text-soft)]` : `text-[var(--app-text-muted)]`,
                                )}
                              >
                                {highlightMatches(keywordsText, queryTokens)}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {exactMatch ? (
                              <span className="rounded-full border border-transparent bg-[var(--app-primary)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--app-primary-contrast)]">
                                Exact match
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                `hidden rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] sm:inline-flex`,
                                isActive
                                  ? `border-transparent bg-[var(--app-surface)] text-[var(--app-primary)]`
                                  : `border-[color:var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-faint)]`,
                              )}
                            >
                              {route.group}
                            </span>
                            <span
                              className={cn(
                                `text-[11px] font-medium`,
                                isActive ? `text-[var(--app-primary)]` : `text-[var(--app-text-faint)]`,
                              )}
                            >
                              Enter
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--app-border)] px-3 py-3 text-xs sm:px-4 md:px-5">
          <div className="flex flex-wrap items-center gap-3 text-[var(--app-text-faint)]">
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-md border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text-soft)]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-md border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text-soft)]">
                ↵
              </kbd>
              Open
            </span>
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-md border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text-soft)]">
                Esc
              </kbd>
              Close
            </span>
          </div>
          <div className="text-[var(--app-text-muted)]">
            {query ? `Press Enter to open the selected result.` : `Start typing to narrow down pages and actions.`}
          </div>
        </div>
      </div>
    </div>
  );
}
