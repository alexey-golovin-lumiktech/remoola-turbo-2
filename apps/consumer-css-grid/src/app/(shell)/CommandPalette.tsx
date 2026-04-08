'use client';

import { useRouter } from 'next/navigation';
import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SearchIcon, cn } from '@remoola/ui';

type CommandGroup = `Pages` | `Actions`;

interface CommandRoute {
  label: string;
  href: string;
  keywords: string[];
  group: CommandGroup;
}

interface IndexedCommandRoute extends CommandRoute {
  index: number;
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

function matchRoutes(query: string): IndexedCommandRoute[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) {
    return INDEXED_ROUTES;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredRoutes = useMemo(() => matchRoutes(query), [query]);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

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

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [onClose, router],
  );

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === `ArrowDown`) {
        event.preventDefault();
        setActiveIndex((current) => {
          if (filteredRoutes.length === 0) {
            return 0;
          }

          return Math.min(current + 1, filteredRoutes.length - 1);
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
        const selectedRoute = filteredRoutes[activeIndexRef.current];
        if (selectedRoute) {
          navigate(selectedRoute.href);
        }
      }
    },
    [filteredRoutes, navigate],
  );

  const groupedRoutes = useMemo(() => {
    const groups = new Map<CommandGroup, IndexedCommandRoute[]>();

    for (const route of filteredRoutes) {
      const existing = groups.get(route.group);
      if (existing) {
        existing.push(route);
      } else {
        groups.set(route.group, [route]);
      }
    }

    return groups;
  }, [filteredRoutes]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        `fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] transition-opacity duration-200 md:p-6 md:pt-[14vh]`,
        open ? `pointer-events-auto opacity-100` : `pointer-events-none opacity-0`,
      )}
      data-testid="consumer-css-grid-command-palette"
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close command palette"
      />

      <div
        className={cn(
          `relative z-10 flex max-h-[min(72vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1a1a2e] text-white/90 shadow-[0_32px_120px_rgba(0,0,0,0.45)] transition-all duration-200`,
          open ? `translate-y-0 scale-100 opacity-100` : `translate-y-2 scale-[0.98] opacity-0`,
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 md:px-5">
          <SearchIcon size={16} className="shrink-0 text-white/50" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/35"
            aria-label="Search pages and actions"
            aria-activedescendant={filteredRoutes[activeIndex] ? `command-palette-item-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
            tabIndex={open ? 0 : -1}
          />
          <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
            Esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          className="max-h-[52vh] space-y-4 overflow-y-auto px-3 py-3 md:px-4"
          role="listbox"
          aria-label="Search results"
        >
          {filteredRoutes.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-white/55">
              No results for &ldquo;{query}&rdquo;.
            </li>
          ) : (
            Array.from(groupedRoutes.entries()).map(([group, routes]) => (
              <li key={group} role="presentation">
                <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">{group}</p>
                <ul role="group" aria-label={group} className="space-y-1">
                  {routes.map((route) => {
                    const routeIndex = filteredRoutes.indexOf(route);
                    const isActive = activeIndex === routeIndex;

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
                            `flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition`,
                            isActive
                              ? `border-white/20 bg-white/12 text-white`
                              : `border-transparent bg-white/5 text-white/80 hover:border-white/10 hover:bg-white/8`,
                          )}
                          onMouseEnter={() => setActiveIndex(routeIndex)}
                          onClick={() => navigate(route.href)}
                          tabIndex={-1}
                        >
                          <span className="text-sm font-medium">{route.label}</span>
                          <span className="truncate text-xs text-white/45">{route.href}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/45 md:px-5">
          <span className="inline-flex items-center gap-2">
            <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
              ↑↓
            </kbd>
            Navigate
          </span>
          <span className="inline-flex items-center gap-2">
            <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
              ↵
            </kbd>
            Open
          </span>
        </div>
      </div>
    </div>
  );
}
