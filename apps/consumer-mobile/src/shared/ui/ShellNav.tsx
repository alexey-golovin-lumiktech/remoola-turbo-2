'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { cn, RemoolaCompactLogo, RemoolaLogo } from '@remoola/ui';

import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ExchangeIcon } from './icons/ExchangeIcon';
import { HomeIcon } from './icons/HomeIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';
import styles from './ShellNav.module.css';
import { ThemeSwitcher } from './ThemeSwitcher';

type NavIconProps = { className?: string };

const navItems: Array<{ href: string; label: string; Icon: React.ComponentType<NavIconProps> }> = [
  { href: `/dashboard`, label: `Home`, Icon: HomeIcon },
  { href: `/payments`, label: `Payments`, Icon: CreditCardIcon },
  { href: `/exchange`, label: `Exchange`, Icon: ExchangeIcon },
  { href: `/contracts`, label: `Contracts`, Icon: DocumentIcon },
  { href: `/contacts`, label: `Contacts`, Icon: UsersIcon },
  { href: `/settings`, label: `Settings`, Icon: SettingsIcon },
];

export function ShellHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logoBox} aria-hidden="true">
          <RemoolaCompactLogo className={styles.logoImageCompact} />
          <RemoolaLogo className={styles.logoImageDesktop} />
        </div>
      </div>
      <div className={styles.headerRight}>
        <ThemeSwitcher />
        <form method="post" action="/logout" style={{ display: `contents` }}>
          <button
            type="submit"
            className={styles.logoutLink}
            aria-label="Log out"
            data-testid="consumer-mobile-shell-logout"
          >
            <LogoutIcon className={styles.navIcon} />
            <span className={styles.logoutText}>Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary" data-testid="consumer-mobile-shell-nav">
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== `/dashboard` && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(styles.navLink, active ? styles.navLinkActive : styles.navLinkInactive)}
            data-testid={`consumer-mobile-shell-nav-${href.replace(/^\//, ``) || `dashboard`}`}
            aria-current={active ? `page` : undefined}
          >
            {active ? <div className={styles.navLinkActiveBg} aria-hidden /> : null}
            <span className={styles.navLinkColumn}>
              <span className={styles.navLinkContent}>
                <Icon className={styles.navIcon} />
              </span>
              <span className={styles.navLinkContent}>{label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
