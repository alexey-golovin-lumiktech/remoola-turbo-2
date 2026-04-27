import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

export type MobileQueueCardProps = {
  id: string;
  href?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
};

export function MobileQueueCard({
  id,
  href,
  eyebrow,
  title,
  subtitle,
  trailing,
  badges,
  children,
}: MobileQueueCardProps): ReactElement {
  const titleNode = href ? (
    <Link href={href} className="min-w-0 text-white transition hover:text-cyan-200">
      <strong className="block break-words">{title}</strong>
    </Link>
  ) : (
    <strong className="block break-words text-white">{title}</strong>
  );

  return (
    <article
      className="rounded-card border border-border bg-panel p-4 shadow-xs transition hover:border-white/20"
      data-card-id={id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-1 flex-col gap-1">
          {eyebrow ? (
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">{eyebrow}</div>
          ) : null}
          {titleNode}
          {subtitle ? <div className="break-words text-xs text-muted-56">{subtitle}</div> : null}
          {badges ? <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        </div>
        {trailing ? <div className="max-w-[40%] shrink-0 text-right text-xs text-white/65">{trailing}</div> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2.5 text-sm text-white/72">{children}</div>
    </article>
  );
}

type MobileQueueSectionProps = {
  title: string;
  children: ReactNode;
  compact?: boolean;
};

export function MobileQueueSection({ title, children, compact = false }: MobileQueueSectionProps): ReactElement | null {
  if (children == null || children === false) {
    return null;
  }

  return (
    <section
      className={cn(
        `rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2.5`,
        compact && `px-0 py-0 border-transparent bg-transparent`,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">{title}</div>
      <div className="mt-2 flex flex-col gap-1.5 break-words">{children}</div>
    </section>
  );
}
