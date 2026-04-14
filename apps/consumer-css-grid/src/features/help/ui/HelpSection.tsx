import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

interface HelpSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function HelpSection({ title, description, children, className }: HelpSectionProps) {
  return (
    <section className={cn(`space-y-4`, className)}>
      <header>
        <h3 className="text-lg font-semibold text-[var(--app-text)] md:text-xl">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-7 text-[var(--app-text-soft)]">{description}</p> : null}
      </header>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
