import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

interface HelpArticleProps {
  title: string;
  summary?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function HelpArticle({ title, summary, eyebrow, children, className }: HelpArticleProps) {
  return (
    <article
      className={cn(
        `rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow)]`,
        className,
      )}
    >
      <header className="border-b border-[color:var(--app-border)] pb-5">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--app-text)] md:text-3xl">{title}</h2>
        {summary ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)]">{summary}</p> : null}
      </header>

      <div className="mt-6 space-y-6">{children}</div>
    </article>
  );
}
