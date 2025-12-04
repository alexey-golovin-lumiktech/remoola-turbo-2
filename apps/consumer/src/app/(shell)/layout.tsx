'use client';
import { usePathname } from 'next/navigation';
import React from 'react';

import { SidebarLink } from '@remoola/ui/SidebarLink';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // ✅ consistent on server and client

  return (
    <div className="mx-auto flex gap-6 px-3 py-4 sm:px-6 lg:px-8">
      <aside
        className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 rounded-3xl bg-blue-900
      p-4 text-white shadow-xl lg:block"
      >
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-xl bg-white/20" />
          <span className="text-lg font-bold tracking-tight">Remoola</span>
        </div>
        <nav className="mt-6 space-y-1">
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
            Payment Methods
          </SidebarLink>
        </nav>
        <div className="absolute bottom-4 left-0 right-0 px-4 text-xs text-white/70">© Remoola 2025</div>
      </aside>
      <main className="flex-1">
        <header className="mb-5 flex items-center gap-3">
          <div className="relative w-full">
            <input
              placeholder="Search anything..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm
              outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>
          </div>
          <a
            href="/logout"
            className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
          >
            ⎋
          </a>
        </header>
        {children}
      </main>
    </div>
  );
}
