'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { ChevronRightIcon } from './icons/ChevronRightIcon';

const defaultRowClassName = `
  group
  flex
  min-h-18
  items-center
  justify-between
  px-6
  py-5
  transition-all
  hover:bg-slate-50
  dark:hover:bg-slate-700/50
  active:scale-[0.99]
`;

const defaultIconContainerClassName = `
  flex
  h-12
  w-12
  shrink-0
  items-center
  justify-center
  rounded-xl
  bg-linear-to-br
  from-primary-50
  to-primary-100
  shadow-xs
  ring-1
  ring-primary-100
  dark:from-primary-900/20
  dark:to-primary-900/10
  dark:ring-primary-900/30
`;

const defaultChevronClassName = `
  h-5
  w-5
  shrink-0
  text-slate-400
  transition-all
  group-hover:translate-x-1
  group-hover:text-primary-500
  dark:text-slate-500
`;

interface NavCardBaseProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconContainerClassName?: string;
  trailing?: ReactNode;
  className?: string;
  /** Use items-start and gap-3 for card-style layout (e.g. exchange page) */
  alignStart?: boolean;
}

interface NavCardLinkProps extends NavCardBaseProps {
  href: string;
  onClick?: never;
}

interface NavCardButtonProps extends NavCardBaseProps {
  href?: never;
  onClick: () => void;
}

export type NavCardProps = NavCardLinkProps | NavCardButtonProps;

/**
 * NavCard - Link or button row with icon, title, optional subtitle, and trailing chevron.
 * Use for settings links, exchange cards, and list rows that navigate.
 */
export function NavCard({
  href,
  onClick,
  icon,
  title,
  subtitle,
  iconContainerClassName = defaultIconContainerClassName,
  trailing,
  className = defaultRowClassName,
  alignStart = false,
}: NavCardProps) {
  const innerFlex = alignStart ? `flex items-start gap-3` : `flex items-center gap-4`;
  const textWrapper = `flex-1 min-w-0`;
  const titleClass = alignStart
    ? `truncate text-base font-bold text-slate-900 transition-colors group-hover:text-slate-800 dark:text-slate-100 dark:group-hover:text-white`
    : `truncate font-semibold text-slate-900 dark:text-white`;
  const subtitleClass = alignStart
    ? `mt-1 text-sm text-slate-500 dark:text-slate-400`
    : `text-sm text-slate-600 dark:text-slate-400`;

  const content = (
    <>
      <div className={innerFlex}>
        <div className={iconContainerClassName}>{icon}</div>
        <div className={textWrapper}>
          <h3 className={titleClass}>{title}</h3>
          {subtitle != null && <p className={subtitleClass}>{subtitle}</p>}
        </div>
      </div>
      {trailing ?? <ChevronRightIcon className={defaultChevronClassName} />}
    </>
  );

  if (href != null) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
