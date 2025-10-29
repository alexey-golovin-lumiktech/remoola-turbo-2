import Link from 'next/link';
import { cn } from '../utils/cn';
import React from 'react';

export function SidebarLink({
  href,
  active,
  children,
  className
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(`rm-sb-link`, active && `rm-sb-link--active`, className)}
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-white/20">•</span>
      {children}
    </Link>
  );
}
