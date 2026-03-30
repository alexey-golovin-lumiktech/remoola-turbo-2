'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@remoola/ui';

import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ExchangeIcon } from './icons/ExchangeIcon';
import { HomeIcon } from './icons/HomeIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';
import styles from './ShellNav.module.css';
import { ThemeSwitcher } from './ThemeSwitcher';

const navItems = [
  { href: `/dashboard`, label: `Home`, icon: <HomeIcon className={styles.navIcon} /> },
  { href: `/payments`, label: `Payments`, icon: <CreditCardIcon className={styles.navIcon} /> },
  { href: `/exchange`, label: `Exchange`, icon: <ExchangeIcon className={styles.navIcon} /> },
  { href: `/contracts`, label: `Contracts`, icon: <DocumentIcon className={styles.navIcon} /> },
  { href: `/contacts`, label: `Contacts`, icon: <UsersIcon className={styles.navIcon} /> },
  { href: `/settings`, label: `Settings`, icon: <SettingsIcon className={styles.navIcon} /> },
];

export function ShellHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logoBox}>
          <span className={styles.logoText}>R</span>
        </div>
        <span className={styles.brandName}>Remoola</span>
      </div>
      <div className={styles.headerRight}>
        <ThemeSwitcher />
        <a href="/logout" className={styles.logoutLink} aria-label="Log out" data-testid="consumer-mobile-shell-logout">
          <LogoutIcon className={styles.navIcon} />
          <span className={styles.logoutText}>Log out</span>
        </a>
      </div>
    </header>
  );
}

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary" data-testid="consumer-mobile-shell-nav">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== `/dashboard` && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(styles.navLink, active ? styles.navLinkActive : styles.navLinkInactive)}
            data-testid={`consumer-mobile-shell-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
            aria-current={active ? `page` : undefined}
          >
            {active ? <div className={styles.navLinkActiveBg} aria-hidden /> : null}
            <div className={styles.navLinkContent}>{item.icon}</div>
            <span className={styles.navLinkContent}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
