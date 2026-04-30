'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn, RemoolaCompactLogo, RemoolaLogo, SearchIcon } from '@remoola/ui';

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

interface CommandPaletteTriggerProps {
  compact?: boolean;
  commandShortcutLabel: string;
  onOpenCommandPalette: () => void;
  testId: string;
}

function CommandPaletteTrigger({
  compact = false,
  commandShortcutLabel,
  onOpenCommandPalette,
  testId,
}: CommandPaletteTriggerProps) {
  const triggerLabel = compact ? `Search` : `Quick search`;
  const shortcutHint = `Shortcut: ${commandShortcutLabel}`;

  return (
    <button
      type="button"
      onClick={onOpenCommandPalette}
      className={cn(
        `border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow) transition hover:bg-(--app-surface-strong) hover:text-(--app-text)`,
        compact
          ? `rounded-xl px-3 py-2 text-sm text-(--app-text-soft)`
          : `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-(--app-text-soft)`,
      )}
      aria-label={`Open quick search. ${shortcutHint}`}
      title={`${triggerLabel} (${commandShortcutLabel})`}
      data-testid={testId}
    >
      <SearchIcon size={16} className="shrink-0" aria-hidden="true" />
      {compact ? null : <span className="whitespace-nowrap">Quick search</span>}
      {compact ? null : (
        <kbd className="rounded-md border border-(--app-border) bg-(--app-surface-strong) px-2 py-1 text-[10px] font-medium text-(--app-text-faint)">
          {commandShortcutLabel}
        </kbd>
      )}
    </button>
  );
}

export function ShellSidebar({
  commandShortcutLabel,
  onOpenCommandPalette,
}: {
  commandShortcutLabel: string;
  onOpenCommandPalette: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="border-b border-(--app-border) bg-(--app-shell) backdrop-blur md:fixed md:left-0 md:top-0 md:h-screen md:w-[248px] md:overflow-hidden md:border-b-0 md:border-r"
      data-testid="consumer-css-grid-shell-sidebar"
    >
      <div className="flex items-center justify-between px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-[60px] items-center overflow-hidden md:w-[136px]">
            <RemoolaCompactLogo className="h-full w-full object-contain md:hidden" />
            <RemoolaLogo className="hidden h-full w-full object-contain md:block" />
          </div>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <CommandPaletteTrigger
            compact
            commandShortcutLabel={commandShortcutLabel}
            onOpenCommandPalette={onOpenCommandPalette}
            testId="consumer-css-grid-command-palette-trigger-mobile"
          />
          <ThemeQuickSwitch compact />
          <form method="post" action="/logout" className="contents">
            <button
              type="submit"
              className="rounded-xl border 
              border-(--app-border) bg-(--app-surface) 
              px-3 py-2 text-sm text-(--app-text-soft) shadow-(--app-shadow)"
              aria-label="Log out"
              data-testid="consumer-css-grid-shell-logout-mobile"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

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
                      ? `bg-(--app-primary-soft) text-(--app-text)`
                      : `text-(--app-text-soft) hover:bg-(--app-surface) hover:text-(--app-text)`,
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

        <div className="mt-4 space-y-4 border-t border-(--app-border) pt-4">
          <ThemeQuickSwitch showLabel />
          <form method="post" action="/logout" className="contents">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--app-text-soft) transition hover:bg-(--app-surface) hover:text-(--app-text)"
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

export function ShellTopBar({
  commandShortcutLabel,
  onOpenCommandPalette,
}: {
  commandShortcutLabel: string;
  onOpenCommandPalette: () => void;
}) {
  return (
    <header
      className="hidden items-center justify-between border-b border-(--app-border) px-6 py-4 md:flex"
      data-testid="consumer-css-grid-shell-topbar"
    >
      <div className="w-full max-w-xl rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm text-(--app-text-faint)">
        <div className="flex flex-wrap items-center gap-2">
          <span>Use quick search to jump between pages and actions.</span>
          <span className="inline-flex items-center gap-2 text-(--app-text-muted)">
            <span>You can also press</span>
            <kbd className="rounded-md border border-(--app-border) bg-(--app-surface-strong) px-2 py-1 text-[10px] font-medium text-(--app-text-faint)">
              {commandShortcutLabel}
            </kbd>
          </span>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <CommandPaletteTrigger
          commandShortcutLabel={commandShortcutLabel}
          onOpenCommandPalette={onOpenCommandPalette}
          testId="consumer-css-grid-command-palette-trigger"
        />
        <ThemeQuickSwitch />
        <form method="post" action="/logout" className="contents">
          <button
            type="submit"
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2 text-sm text-(--app-text-soft) transition hover:bg-(--app-surface-strong) hover:text-(--app-text)"
            data-testid="consumer-css-grid-shell-logout-topbar"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

export function ShellBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-(--app-border) bg-(--app-shell) px-2 py-2 backdrop-blur md:hidden"
      aria-label="Primary"
      data-testid="consumer-css-grid-shell-bottom-nav"
    >
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {mobileNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px]`,
                active ? `bg-(--app-primary-soft) text-(--app-primary)` : `text-(--app-text-muted)`,
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
