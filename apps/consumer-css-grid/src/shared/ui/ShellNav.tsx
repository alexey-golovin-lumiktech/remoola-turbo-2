'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn, RemoolaCompactLogo, RemoolaLogo } from '@remoola/ui';

import { ThemeQuickSwitch } from '../theme/ThemeQuickSwitch';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { BankIcon } from './icons/BankIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ExchangeIcon } from './icons/ExchangeIcon';
import { HomeIcon } from './icons/HomeIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';

/* ── Sidebar nav items (9 items matching layout reference) ── */

const sidebarItems = [
  { href: `/dashboard`, label: `Dashboard`, Icon: HomeIcon },
  { href: `/contracts`, label: `Contracts`, Icon: DocumentIcon },
  { href: `/payments`, label: `Payments`, Icon: CreditCardIcon },
  { href: `/documents`, label: `Documents`, Icon: DocumentIcon },
  { href: `/contacts`, label: `Contacts`, Icon: UsersIcon },
  { href: `/banking`, label: `Bank & Cards`, Icon: BankIcon },
  { href: `/withdraw`, label: `Withdraw`, Icon: ArrowDownIcon },
  { href: `/exchange`, label: `Exchange`, Icon: ExchangeIcon },
  { href: `/settings`, label: `Settings`, Icon: SettingsIcon },
];

/* ── Mobile bottom nav items (6 items, reference grid-cols-6) */

const mobileNavItems = [
  { href: `/dashboard`, label: `Home`, Icon: HomeIcon },
  { href: `/payments`, label: `Payments`, Icon: CreditCardIcon },
  { href: `/exchange`, label: `Exchange`, Icon: ExchangeIcon },
  { href: `/contracts`, label: `Contracts`, Icon: DocumentIcon },
  { href: `/contacts`, label: `Contacts`, Icon: UsersIcon },
  { href: `/settings`, label: `Settings`, Icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === `/dashboard`) return pathname === href;
  return pathname.startsWith(href);
}

/* ── Sidebar ─────────────────────────────────────────────── */

export function ShellSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="border-b border-[color:var(--app-border)] bg-[var(--app-shell)] backdrop-blur md:fixed md:left-0 md:top-0 md:h-screen md:w-[248px] md:overflow-hidden md:border-b-0 md:border-r"
      data-testid="consumer-css-grid-shell-sidebar"
    >
      {/* Logo header */}
      <div className="flex items-center justify-between px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-[60px] items-center overflow-hidden md:w-[136px]">
            <RemoolaCompactLogo className="h-full w-full object-contain md:hidden" />
            <RemoolaLogo className="hidden h-full w-full object-contain md:block" />
          </div>
        </div>

        {/* Mobile quick actions (visible on mobile only) */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeQuickSwitch compact />
          <form method="post" action="/logout" className="contents">
            <button
              type="submit"
              className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text-soft)] shadow-[var(--app-shadow)]"
              aria-label="Log out"
              data-testid="consumer-css-grid-shell-logout-mobile"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Desktop nav (hidden on mobile) */}
      <nav
        className="hidden px-3 pb-5 md:block md:h-[calc(100vh-80px)] md:overflow-y-auto"
        aria-label="Primary"
        data-testid="consumer-css-grid-shell-nav"
      >
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition`,
                    active
                      ? `bg-[var(--app-primary-soft)] text-[var(--app-text)]`
                      : `text-[var(--app-text-soft)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]`,
                  )}
                  data-testid={`consumer-css-grid-shell-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
                >
                  <item.Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Logout at bottom of sidebar */}
        <div className="mt-4 space-y-4 border-t border-[color:var(--app-border)] pt-4">
          <ThemeQuickSwitch />
          <form method="post" action="/logout" className="contents">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              data-testid="consumer-css-grid-shell-logout"
            >
              <LogoutIcon className="h-5 w-5 shrink-0" />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}

/* ── Desktop top bar (hidden on mobile) ─────────────────── */

export function ShellTopBar() {
  return (
    <header
      className="hidden items-center justify-between border-b border-[color:var(--app-border)] px-6 py-4 md:flex"
      data-testid="consumer-css-grid-shell-topbar"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text-faint)]">
        Use the left navigation to jump between dashboard, payments, exchange, and settings.
      </div>
      <div className="ml-4 grid grid-cols-[minmax(0,180px)_auto] items-center gap-3">
        <ThemeQuickSwitch />
        <form method="post" action="/logout" className="contents">
          <button
            type="submit"
            className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface-strong)] hover:text-[var(--app-text)]"
            data-testid="consumer-css-grid-shell-logout-topbar"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

/* ── Mobile bottom nav (hidden on desktop) ───────────────── */

export function ShellBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--app-border)] bg-[var(--app-shell)] px-2 py-2 backdrop-blur md:hidden"
      aria-label="Primary"
      data-testid="consumer-css-grid-shell-bottom-nav"
    >
      {/* 6-column grid matching layout reference */}
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {mobileNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px]`,
                active ? `bg-[var(--app-primary-soft)] text-[var(--app-primary)]` : `text-[var(--app-text-muted)]`,
              )}
              data-testid={`consumer-css-grid-shell-bottom-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
            >
              <item.Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
