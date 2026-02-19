'use client';
import { usePathname } from 'next/navigation';
import React from 'react';

import { SidebarLink } from '@remoola/ui/SidebarLink';

import styles from '../../components/ui/classNames.module.css';

const {
  shellAside,
  shellBrandIcon,
  shellBrandRow,
  shellBrandText,
  shellContainer,
  shellFooter,
  shellHeader,
  shellLogout,
  shellMain,
  shellNav,
  shellSearchHint,
  shellSearchInput,
  shellSearchWrap,
} = styles;

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // ✅ consistent on server and client
  const mobileNavItems = [
    { href: `/dashboard`, label: `Home`, active: pathname === `/` || pathname.startsWith(`/dashboard`) },
    { href: `/payments`, label: `Payments`, active: pathname.startsWith(`/payments`) },
    { href: `/contracts`, label: `Contracts`, active: pathname.startsWith(`/contracts`) },
    { href: `/contacts`, label: `Contacts`, active: pathname.startsWith(`/contacts`) },
    { href: `/settings`, label: `Settings`, active: pathname.startsWith(`/settings`) },
  ];
  const mobileHeaderClass = `mb-4
  flex
  items-center
  justify-between
  gap-3
  rounded-2xl
  bg-white/90
  dark:bg-slate-900/80
  px-4
  py-3
  shadow-sm
  ring-1
  ring-black/5
  dark:ring-white/10
  lg:hidden`;
  const mobileBrandClass = `flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white`;
  const mobileLogoClass = `h-7 w-7 rounded-lg bg-blue-600/80`;
  const mobileNavClass = `fixed
  bottom-0
  left-0
  right-0
  z-30
  border-t
  border-gray-200
  dark:border-slate-700
  bg-white/95
  dark:bg-slate-900/95
  backdrop-blur
  lg:hidden`;
  const mobileNavInnerClass = `mx-auto
  flex
  items-center
  justify-around
  px-3
  py-2
  text-xs
  font-medium
  text-gray-600
  dark:text-slate-300`;
  const mobileNavLinkClass = `flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition`;
  const mobileNavLinkActiveClass = `text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-900/30`;

  return (
    <div className={shellContainer} data-testid="consumer-shell">
      <aside className={shellAside} data-testid="consumer-shell-sidebar">
        <div className={shellBrandRow}>
          <div className={shellBrandIcon} />
          <span className={shellBrandText}>Remoola</span>
        </div>
        <nav className={shellNav} data-testid="consumer-shell-nav">
          <SidebarLink href="/dashboard" active={pathname == `/` || pathname.startsWith(`/dashboard`)}>
            Dashboard
          </SidebarLink>

          <SidebarLink href="/contracts" active={pathname.startsWith(`/contracts`)}>
            Contracts
          </SidebarLink>

          <SidebarLink href="/payments" active={pathname.startsWith(`/payments`)}>
            Payments
          </SidebarLink>

          <SidebarLink href="/documents" active={pathname.startsWith(`/documents`)}>
            Documents
          </SidebarLink>

          <SidebarLink href="/contacts" active={pathname.startsWith(`/contacts`)}>
            Contacts
          </SidebarLink>

          <SidebarLink href="/payment-methods" active={pathname.startsWith(`/payment-methods`)}>
            Bank And Cards
          </SidebarLink>

          <SidebarLink href="/withdraw-transfer" active={pathname.startsWith(`/withdraw-transfer`)}>
            Withdraw And Transfer
          </SidebarLink>

          <SidebarLink href="/exchange" active={pathname.startsWith(`/exchange`)}>
            Exchange Rate
          </SidebarLink>

          <SidebarLink href="/settings" active={pathname.startsWith(`/settings`)}>
            Settings
          </SidebarLink>
        </nav>
        <div className={shellFooter}>© Remoola 2025</div>
      </aside>
      <main className={shellMain} data-testid="consumer-shell-main">
        <div className={mobileHeaderClass} data-testid="consumer-shell-mobile-header">
          <div className={mobileBrandClass}>
            <span className={mobileLogoClass} />
            Remoola
          </div>
          <a href="/logout" className={shellLogout} aria-label="Log out" data-testid="consumer-shell-logout-mobile">
            ⎋
          </a>
        </div>
        <header className={shellHeader} data-testid="consumer-shell-header">
          <div className={shellSearchWrap}>
            <input placeholder="Search anything..." className={shellSearchInput} data-testid="consumer-shell-search" />
            <span className={shellSearchHint}>⌘K</span>
          </div>
          <a
            href="/logout"
            className={`${shellLogout} hidden lg:grid`}
            aria-label="Log out"
            data-testid="consumer-shell-logout"
          >
            ⎋
          </a>
        </header>
        {children}
      </main>
      <nav className={mobileNavClass} aria-label="Primary" data-testid="consumer-shell-mobile-nav">
        <div className={mobileNavInnerClass}>
          {mobileNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`${mobileNavLinkClass} ${item.active ? mobileNavLinkActiveClass : ``}`}
              aria-current={item.active ? `page` : undefined}
              data-testid={`consumer-shell-mobile-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
