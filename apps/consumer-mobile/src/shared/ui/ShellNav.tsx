'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ExchangeIcon } from './icons/ExchangeIcon';
import { HomeIcon } from './icons/HomeIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';

const navItems = [
  {
    href: `/dashboard`,
    label: `Home`,
    icon: <HomeIcon className={`h-5 w-5`} />,
  },
  {
    href: `/payments`,
    label: `Payments`,
    icon: <CreditCardIcon className={`h-5 w-5`} />,
  },
  {
    href: `/exchange`,
    label: `Exchange`,
    icon: <ExchangeIcon className={`h-5 w-5`} />,
  },
  {
    href: `/contracts`,
    label: `Contracts`,
    icon: <DocumentIcon className={`h-5 w-5`} />,
  },
  {
    href: `/contacts`,
    label: `Contacts`,
    icon: <UsersIcon className={`h-5 w-5`} />,
  },
  {
    href: `/settings`,
    label: `Settings`,
    icon: <SettingsIcon className={`h-5 w-5`} />,
  },
];

export function ShellHeader() {
  return (
    <header
      className={
        `flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 ` +
        `bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95`
      }
    >
      <div className={`flex items-center gap-2`}>
        <div
          className={`
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
          bg-gradient-to-br
          from-primary-500
          to-primary-700
          text-white
          shadow-sm
        `}
        >
          <span className={`text-sm font-bold`}>R</span>
        </div>
        <span
          className={`
          text-base
          font-bold
          text-slate-900
          dark:text-white
        `}
        >
          Remoola
        </span>
      </div>
      <a
        href="/logout"
        className={
          `group flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium ` +
          `text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`
        }
        aria-label="Log out"
        data-testid="consumer-mobile-shell-logout"
      >
        <LogoutIcon className={`h-5 w-5`} />
        <span className={`hidden sm:inline`}>Log out</span>
      </a>
    </header>
  );
}

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav
      className={
        `flex shrink-0 items-center justify-around border-t border-slate-200 ` +
        `bg-white/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm ` +
        `shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:border-slate-700 dark:bg-slate-900/95`
      }
      aria-label="Primary"
      data-testid="consumer-mobile-shell-nav"
    >
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== `/dashboard` && pathname.startsWith(item.href));
        const linkClass =
          `relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl ` +
          `px-3 py-2 text-[11px] font-medium transition-all duration-200 ` +
          (active
            ? `scale-105 text-primary-600 dark:text-primary-400`
            : `text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass}
            data-testid={`consumer-mobile-shell-nav-${item.href.replace(/^\//, ``) || `dashboard`}`}
          >
            {active && (
              <div
                className={`
              absolute
              inset-0
              rounded-xl
              bg-primary-50
              dark:bg-primary-900/20
            `}
              />
            )}
            <div className={`relative z-10`}>{item.icon}</div>
            <span className={`relative z-10`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
