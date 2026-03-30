'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import {
  BankBuildingIcon,
  DocumentListIcon,
  ExchangeIcon,
  FolderIcon,
  HomeIcon,
  LogoutLineIcon,
  MoreVerticalIcon,
  PaymentCardIcon,
  SearchIcon,
  SettingsGearIcon,
  TransferIcon,
  UsersIcon,
  cn,
} from '@remoola/ui';
import { SidebarLink } from '@remoola/ui/SidebarLink';

import localStyles from './layout.module.css';
import styles from '../../components/ui/classNames.module.css';
import { CommandPalette } from '../../components/ui/CommandPalette';

const {
  shellAside,
  shellBrandIcon,
  shellBrandRow,
  shellBrandText,
  shellContainer,
  shellFooter,
  shellHeader,
  shellMain,
  shellMobileBrand,
  shellMobileHeader,
  shellMobileLogo,
  shellMobileNav,
  shellNav,
  shellSearchHint,
  shellSearchInput,
  shellSearchWrap,
} = styles;

// ── Mobile "More" drawer ──────────────────────────────────────────────────────

function MobileMoreDrawer({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  if (!open) return null;

  const extraItems = [
    { href: `/documents`, label: `Documents`, icon: <FolderIcon size={16} aria-hidden="true" /> },
    { href: `/payment-methods`, label: `Bank & Cards`, icon: <BankBuildingIcon size={16} aria-hidden="true" /> },
    { href: `/withdraw-transfer`, label: `Withdraw`, icon: <TransferIcon size={16} aria-hidden="true" /> },
    { href: `/exchange`, label: `Exchange`, icon: <ExchangeIcon size={16} aria-hidden="true" /> },
    { href: `/settings`, label: `Settings`, icon: <SettingsGearIcon size={16} aria-hidden="true" /> },
  ];

  return (
    <>
      <button
        type="button"
        className={localStyles.moreDrawerBackdrop}
        onClick={onClose}
        aria-label="Close more navigation"
      >
        <span className={localStyles.srOnly}>Close more navigation</span>
      </button>
      <div
        id="mobile-more-drawer"
        className={localStyles.moreDrawerPanel}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
      >
        <div className={localStyles.moreDrawerGrid}>
          {extraItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  localStyles.moreDrawerLink,
                  isActive ? localStyles.moreDrawerLinkActive : localStyles.moreDrawerLinkInactive,
                )}
                aria-current={isActive ? `page` : undefined}
              >
                <span className={localStyles.drawerItemIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Shell layout ──────────────────────────────────────────────────────────────

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isApplePlatform, setIsApplePlatform] = useState<boolean | null>(null);
  const mainContentId = `consumer-shell-main-content`;
  const currentYear = new Date().getFullYear();
  const closeMoreDrawer = React.useCallback(() => setMoreOpen(false), []);
  const toggleMoreDrawer = React.useCallback(() => {
    setMoreOpen((open) => !open);
  }, []);

  // Global shortcut to open command palette.
  // Chrome reserves Ctrl+K on Linux/Windows, so use Ctrl+/ there instead.
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isAppleShortcut = e.metaKey && e.key.toLowerCase() === `k`;
      const isNonAppleShortcut = e.ctrlKey && e.code === `Slash`;
      const useAppleShortcut = isApplePlatform === true;

      if ((useAppleShortcut && isAppleShortcut) || (!useAppleShortcut && isNonAppleShortcut)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener(`keydown`, handleKeyDown);
    return () => window.removeEventListener(`keydown`, handleKeyDown);
  }, [isApplePlatform]);

  React.useEffect(() => {
    setIsApplePlatform(/(Mac|iPhone|iPad|iPod)/i.test(window.navigator.platform));
  }, []);

  React.useEffect(() => {
    if (!moreOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== `Escape`) return;
      event.preventDefault();
      event.stopPropagation();
      closeMoreDrawer();
    }

    document.addEventListener(`keydown`, handleKeyDown, true);
    return () => document.removeEventListener(`keydown`, handleKeyDown, true);
  }, [moreOpen, closeMoreDrawer]);

  React.useEffect(() => {
    closeMoreDrawer();
  }, [pathname, closeMoreDrawer]);

  const shortcutHint = isApplePlatform ? `⌘K` : `Ctrl+/`;

  const mobileNavItems = [
    {
      href: `/dashboard`,
      label: `Home`,
      icon: <HomeIcon size={16} aria-hidden="true" />,
      active: pathname === `/` || pathname.startsWith(`/dashboard`),
    },
    {
      href: `/payments`,
      label: `Payments`,
      icon: <PaymentCardIcon size={16} aria-hidden="true" />,
      active: pathname.startsWith(`/payments`),
    },
    {
      href: `/contacts`,
      label: `Contacts`,
      icon: <UsersIcon size={16} aria-hidden="true" />,
      active: pathname.startsWith(`/contacts`),
    },
    {
      href: `/contracts`,
      label: `Contracts`,
      icon: <DocumentListIcon size={16} aria-hidden="true" />,
      active: pathname.startsWith(`/contracts`),
    },
  ];

  const isMoreActive =
    pathname.startsWith(`/documents`) ||
    pathname.startsWith(`/payment-methods`) ||
    pathname.startsWith(`/withdraw-transfer`) ||
    pathname.startsWith(`/exchange`) ||
    pathname.startsWith(`/settings`);

  return (
    <div className={shellContainer} data-testid="consumer-shell">
      <a
        href={`#${mainContentId}`}
        className={localStyles.skipToMainLink}
        onClick={() => {
          window.requestAnimationFrame(() => {
            document.getElementById(mainContentId)?.focus();
          });
        }}
      >
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      <aside className={shellAside} data-testid="consumer-shell-sidebar">
        <div className={shellBrandRow}>
          <div className={shellBrandIcon} />
          <span className={shellBrandText}>Remoola</span>
        </div>
        <nav className={shellNav} data-testid="consumer-shell-nav">
          <SidebarLink
            href="/dashboard"
            active={pathname === `/` || pathname.startsWith(`/dashboard`)}
            icon={<HomeIcon size={16} aria-hidden="true" />}
          >
            Dashboard
          </SidebarLink>
          <SidebarLink
            href="/contracts"
            active={pathname.startsWith(`/contracts`)}
            icon={<DocumentListIcon size={16} aria-hidden="true" />}
          >
            Contracts
          </SidebarLink>
          <SidebarLink
            href="/payments"
            active={pathname.startsWith(`/payments`)}
            icon={<PaymentCardIcon size={16} aria-hidden="true" />}
          >
            Payments
          </SidebarLink>
          <SidebarLink
            href="/documents"
            active={pathname.startsWith(`/documents`)}
            icon={<FolderIcon size={16} aria-hidden="true" />}
          >
            Documents
          </SidebarLink>
          <SidebarLink
            href="/contacts"
            active={pathname.startsWith(`/contacts`)}
            icon={<UsersIcon size={16} aria-hidden="true" />}
          >
            Contacts
          </SidebarLink>
          <SidebarLink
            href="/payment-methods"
            active={pathname.startsWith(`/payment-methods`)}
            icon={<BankBuildingIcon size={16} aria-hidden="true" />}
          >
            Bank &amp; Cards
          </SidebarLink>
          <SidebarLink
            href="/withdraw-transfer"
            active={pathname.startsWith(`/withdraw-transfer`)}
            icon={<TransferIcon size={16} aria-hidden="true" />}
          >
            Withdraw
          </SidebarLink>
          <SidebarLink
            href="/exchange"
            active={pathname.startsWith(`/exchange`)}
            icon={<ExchangeIcon size={16} aria-hidden="true" />}
          >
            Exchange
          </SidebarLink>
          <SidebarLink
            href="/settings"
            active={pathname.startsWith(`/settings`)}
            icon={<SettingsGearIcon size={16} aria-hidden="true" />}
          >
            Settings
          </SidebarLink>
        </nav>
        <div className={shellFooter} suppressHydrationWarning>
          © Remoola {currentYear}
        </div>
      </aside>

      {/* Main content */}
      <main id={mainContentId} className={shellMain} data-testid="consumer-shell-main" tabIndex={-1}>
        {/* Mobile top bar */}
        <div className={shellMobileHeader} data-testid="consumer-shell-mobile-header">
          <div className={shellMobileBrand}>
            <span className={cn(shellMobileLogo, localStyles.mobileLogoBadge)}>R</span>
            Remoola
          </div>
          <a
            href="/logout"
            className={localStyles.mobileLogoutLink}
            aria-label="Log out"
            data-testid="consumer-shell-logout-mobile"
          >
            <LogoutLineIcon size={16} aria-hidden="true" />
            <span className={localStyles.srOnly}>Log out</span>
          </a>
        </div>

        {/* Desktop header with search */}
        <header className={shellHeader} data-testid="consumer-shell-header">
          <div className={shellSearchWrap}>
            <span className={localStyles.searchIcon}>
              <SearchIcon size={16} aria-hidden="true" />
            </span>
            <input
              placeholder="Search anything..."
              className={cn(shellSearchInput, localStyles.searchInputWithIcon)}
              data-testid="consumer-shell-search"
              role="button"
              aria-label="Open command palette"
              aria-haspopup="dialog"
              readOnly
              onClick={() => setPaletteOpen(true)}
              onKeyDown={(e) => {
                if (e.key === `Enter` || e.key === ` `) setPaletteOpen(true);
              }}
              style={{ cursor: `pointer` }}
            />
            <span className={shellSearchHint} suppressHydrationWarning>
              {shortcutHint}
            </span>
          </div>
          <a
            href="/logout"
            className={localStyles.desktopLogoutLink}
            aria-label="Log out"
            data-testid="consumer-shell-logout"
          >
            <LogoutLineIcon size={16} aria-hidden="true" />
            Log out
          </a>
        </header>

        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className={shellMobileNav} aria-label="Primary" data-testid="consumer-shell-mobile-nav">
        <div className={localStyles.mobileNavInner}>
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(localStyles.mobileNavItem, item.active && localStyles.mobileNavItemActive)}
              aria-current={item.active ? `page` : undefined}
              data-testid={`consumer-shell-mobile-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
          {/* More button */}
          <button
            type="button"
            onClick={toggleMoreDrawer}
            className={cn(localStyles.mobileNavItem, isMoreActive && localStyles.mobileNavItemActive)}
            aria-label="More navigation options"
            aria-haspopup="dialog"
            aria-expanded={moreOpen ? `true` : `false`}
            aria-controls="mobile-more-drawer"
            data-testid="consumer-shell-mobile-nav-more"
          >
            <MoreVerticalIcon size={20} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" drawer */}
      <MobileMoreDrawer open={moreOpen} onClose={closeMoreDrawer} pathname={pathname} />

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
