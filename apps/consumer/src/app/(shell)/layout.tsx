'use client';
import { usePathname } from 'next/navigation';
import React from 'react';

import { SidebarLink } from '@remoola/ui/SidebarLink';

import {
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
} from '../../components/ui/classNames';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // ✅ consistent on server and client

  return (
    <div className={shellContainer}>
      <aside className={shellAside}>
        <div className={shellBrandRow}>
          <div className={shellBrandIcon} />
          <span className={shellBrandText}>Remoola</span>
        </div>
        <nav className={shellNav}>
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
      <main className={shellMain}>
        <header className={shellHeader}>
          <div className={shellSearchWrap}>
            <input placeholder="Search anything..." className={shellSearchInput} />
            <span className={shellSearchHint}>⌘K</span>
          </div>
          <a href="/logout" className={shellLogout}>
            ⎋
          </a>
        </header>
        {children}
      </main>
    </div>
  );
}
