'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { ChevronRightIcon } from './icons/ChevronRightIcon';
import styles from './NavCard.module.css';

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
  iconContainerClassName,
  trailing,
  className,
  alignStart = false,
}: NavCardProps) {
  const rowClass = cn(alignStart ? styles.rowAlignStart : styles.row, className);
  const innerClass = alignStart ? styles.innerAlignStart : styles.inner;
  const titleClass = alignStart ? styles.titleAlignStart : styles.title;
  const subtitleClass = alignStart ? styles.subtitleAlignStart : styles.subtitle;

  const content = (
    <>
      <div className={innerClass}>
        <div className={cn(styles.iconContainer, iconContainerClassName)}>{icon}</div>
        <div className={styles.textWrapper}>
          <h3 className={titleClass}>{title}</h3>
          {subtitle != null ? <p className={subtitleClass}>{subtitle}</p> : null}
        </div>
      </div>
      {trailing ?? <ChevronRightIcon className={styles.chevron} />}
    </>
  );

  if (href != null) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rowClass}>
      {content}
    </button>
  );
}
