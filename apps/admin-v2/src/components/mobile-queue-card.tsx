import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

export type MobileQueueCardProps = {
  id: string;
  href?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
};

export function MobileQueueCard({ id, href, title, subtitle, trailing, children }: MobileQueueCardProps): ReactElement {
  const titleNode = href ? (
    <Link href={href} className="text-white transition hover:text-cyan-200">
      <strong>{title}</strong>
    </Link>
  ) : (
    <strong className="text-white">{title}</strong>
  );

  return (
    <article
      className="rounded-card border border-border bg-panel p-4 transition hover:border-white/20"
      data-card-id={id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {titleNode}
          {subtitle ? <div className="text-xs text-muted-56">{subtitle}</div> : null}
        </div>
        {trailing ? <div className="text-xs text-white/65">{trailing}</div> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm text-white/72">{children}</div>
    </article>
  );
}
