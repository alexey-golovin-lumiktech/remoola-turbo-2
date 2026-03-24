import Link from 'next/link';
import React from 'react';

import { cn } from './cn';

export function SidebarLink({
  href,
  active,
  children,
  className,
  icon,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(`rm-sb-link`, active && `rm-sb-link--active`, className)}>
      <span
        className={`
          grid
          h-5
          w-5
          shrink-0
          place-items-center
        `}
      >
        {icon ?? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="8" r="3" />
          </svg>
        )}
      </span>
      {children}
    </Link>
  );
}
