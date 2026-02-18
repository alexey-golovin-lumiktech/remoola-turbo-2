'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { apiFetch, type AdminMe } from '../lib';
import styles from './ui/classNames.module.css';

const BASE_NAV = [
  { href: `/dashboard`, label: `Dashboard` },
  { href: `/consumers`, label: `Consumers` },
  { href: `/payment-requests`, label: `Payment Requests` },
  { href: `/payment-requests/expectation-date-archive`, label: `Expectation Date Archive` },
  { href: `/exchange/rules`, label: `Exchange Rules` },
  { href: `/exchange/scheduled`, label: `Scheduled FX` },
  { href: `/exchange/rates`, label: `Exchange Rates` },
  { href: `/ledger`, label: `Ledger` },
  // later:
  // { href: "/resources", label: "Resources" },
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
    <aside className={styles.adminSidebar}>
      <div className={styles.adminSidebarHeader}>
        <div className={styles.adminSidebarTitle}>Remoola Admin</div>
        <div className={styles.adminSidebarMeta}>{me ? `${me.email} • ${me.type}` : `Loading…`}</div>
      </div>

      <nav className={styles.adminSidebarNav}>
        {BASE_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                styles.adminSidebarLinkBase,
                active ? styles.adminSidebarLinkActive : styles.adminSidebarLinkInactive,
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
