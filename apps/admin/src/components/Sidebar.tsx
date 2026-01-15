'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiFetch } from '../lib/api';
import { type AdminMe } from '../lib/types';

const BASE_NAV = [
  { href: `/dashboard`, label: `Dashboard` },
  { href: `/consumers`, label: `Consumers` },
  { href: `/payment-requests`, label: `Payment Requests` },
  { href: `/ledger`, label: `Ledger` },
  // later:
  // { href: "/resources", label: "Resources" },
  // { href: "/exchange-rates", label: "Exchange Rates" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => {
    (async () => {
      const response = await apiFetch<AdminMe>(`/api/auth/me`);
      if (response.ok) setMe(response.data);
    })();
  }, []);

  if (me?.type === `SUPER` && BASE_NAV.every((x) => x.href !== `/admins`)) {
    BASE_NAV.unshift({ href: `/admins`, label: `Admins` });
  }

  return (
    <aside className="w-64 border-r bg-white">
      <div className="p-4">
        <div className="text-lg font-semibold">Remoola Admin</div>
        <div className="text-xs text-gray-500">{me ? `${me.email} • ${me.type}` : `Loading…`}</div>
      </div>

      <nav className="px-2 pb-4">
        {BASE_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                `block rounded-lg px-3 py-2 text-sm`,
                active ? `bg-gray-100 font-medium` : `text-gray-700 hover:bg-gray-50`,
              ].join(` `)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
