'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SearchIcon, cn } from '@remoola/ui';

import styles from './CommandPalette.module.css';

interface Route {
  label: string;
  href: string;
  keywords: string[];
  group: string;
}

const ROUTES: Route[] = [
  { label: `Dashboard`, href: `/dashboard`, keywords: [`home`, `overview`, `summary`], group: `Pages` },
  { label: `Payments`, href: `/payments`, keywords: [`pay`, `transaction`, `invoice`], group: `Pages` },
  { label: `Contracts`, href: `/contracts`, keywords: [`agreement`, `contract`], group: `Pages` },
  { label: `Documents`, href: `/documents`, keywords: [`file`, `upload`, `doc`], group: `Pages` },
  { label: `Contacts`, href: `/contacts`, keywords: [`people`, `recipient`, `client`], group: `Pages` },
  {
    label: `Bank & Cards`,
    href: `/payment-methods`,
    keywords: [`bank`, `card`, `payment method`, `stripe`],
    group: `Pages`,
  },
  { label: `Withdraw`, href: `/withdraw-transfer`, keywords: [`withdraw`, `transfer`, `send money`], group: `Pages` },
  { label: `Exchange`, href: `/exchange`, keywords: [`fx`, `currency`, `convert`, `rate`], group: `Pages` },
  { label: `Exchange Rules`, href: `/exchange/rules`, keywords: [`auto exchange`, `rule`], group: `Pages` },
  { label: `Scheduled Conversions`, href: `/exchange/scheduled`, keywords: [`scheduled`, `recurring`], group: `Pages` },
  { label: `Settings`, href: `/settings`, keywords: [`profile`, `account`, `password`, `theme`], group: `Pages` },
  { label: `Start Payment`, href: `/payments/start`, keywords: [`new payment`, `pay now`], group: `Actions` },
  {
    label: `New Payment Request`,
    href: `/payment-requests/new`,
    keywords: [`create request`, `invoice`, `request money`],
    group: `Actions`,
  },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState(``);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const flat = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ROUTES;
    return ROUTES.filter((r) => r.label.toLowerCase().includes(q) || r.keywords.some((k) => k.includes(q)));
  }, [query]);

  // Keep a ref to flat so keyboard handlers always see the latest value
  // without needing to be recreated on every render
  const flatRef = useRef(flat);
  flatRef.current = flat;

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Reset active index when query changes or palette opens
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery(``);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Escape key to close (⌘K toggle is handled exclusively in the shell layout)
  useEffect(() => {
    if (!open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === `Escape`) onClose();
    }
    window.addEventListener(`keydown`, onEscape);
    return () => window.removeEventListener(`keydown`, onEscape);
  }, [open, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-active="true"]`);
    active?.scrollIntoView({ block: `nearest` });
  }, [activeIndex]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === `ArrowDown`) {
        e.preventDefault();
        setActiveIndex((i) => {
          const max = flatRef.current.length - 1;
          return i < max ? i + 1 : i;
        });
      } else if (e.key === `ArrowUp`) {
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : i));
      } else if (e.key === `Enter`) {
        e.preventDefault();
        const route = flatRef.current[activeIndexRef.current];
        if (route) navigate(route.href);
      }
    },
    [navigate],
  );

  // Group results for display (preserves insertion order of ROUTES)
  const grouped = useMemo(() => {
    const map = new Map<string, Route[]>();
    for (const route of flat) {
      const existing = map.get(route.group);
      if (existing) {
        existing.push(route);
      } else {
        map.set(route.group, [route]);
      }
    }
    return map;
  }, [flat]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className={styles.panel}>
        {/* Search input */}
        <div className={styles.searchRow}>
          <SearchIcon size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and actions..."
            className={styles.searchInput}
            aria-label="Search pages and actions"
            aria-activedescendant={flat[activeIndex] ? `cmd-item-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.kbdEscHint}>esc</kbd>
        </div>

        {/* Results */}
        <ul ref={listRef} className={styles.resultsList} role="listbox" aria-label="Search results">
          {flat.length === 0 && <li className={styles.emptyState}>No results for &ldquo;{query}&rdquo;</li>}

          {Array.from(grouped.entries()).map(([group, routes]) => (
            <li key={group} role="presentation">
              <p className={styles.groupHeading}>{group}</p>
              <ul role="group" aria-label={group}>
                {routes.map((route) => {
                  const idx = flat.indexOf(route);
                  const isActive = activeIndex === idx;
                  return (
                    <li key={route.href} role="option" aria-selected={isActive} id={`cmd-item-${idx}`}>
                      <button
                        type="button"
                        data-active={isActive ? `true` : `false`}
                        className={cn(
                          styles.optionButton,
                          isActive ? styles.optionButtonActive : styles.optionButtonInactive,
                        )}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigate(route.href)}
                        tabIndex={-1}
                      >
                        <span className={styles.routeLabel}>{route.label}</span>
                        <span className={styles.routeHref}>{route.href}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd className={styles.kbdFooter}>↑↓</kbd>
            navigate
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbdFooter}>↵</kbd>
            open
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbdFooter}>esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
