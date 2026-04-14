import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

const CALLOUT_TONE = {
  info: {
    container: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
    badge: `bg-[var(--app-primary-soft)] text-[var(--app-primary)]`,
  },
  warning: {
    container: `border-transparent bg-[var(--app-warning-soft)]`,
    badge: `bg-[var(--app-warning-text)]/10 text-[var(--app-warning-text)]`,
  },
  success: {
    container: `border-transparent bg-[var(--app-success-soft)]`,
    badge: `bg-[var(--app-success-text)]/10 text-[var(--app-success-text)]`,
  },
} as const;

export type HelpCalloutVariant = keyof typeof CALLOUT_TONE;

interface HelpCalloutProps {
  variant?: HelpCalloutVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function HelpCallout({ variant = `info`, title, children, className }: HelpCalloutProps) {
  const tone = CALLOUT_TONE[variant];

  return (
    <aside className={cn(`rounded-2xl border px-4 py-4`, tone.container, className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            `inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]`,
            tone.badge,
          )}
        >
          {variant}
        </span>
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold text-[var(--app-text)]">{title}</p> : null}
          <div className="mt-1 text-sm leading-7 text-[var(--app-text-soft)]">{children}</div>
        </div>
      </div>
    </aside>
  );
}
