import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

const CALLOUT_TONE = {
  info: {
    container: `border-(--app-border) bg-(--app-surface-muted)`,
    badge: `bg-(--app-primary-soft) text-(--app-primary)`,
  },
  warning: {
    container: `border-transparent bg-(--app-warning-soft)`,
    badge: `bg-(--app-warning-text)/10 text-(--app-warning-text)`,
  },
  success: {
    container: `border-transparent bg-(--app-success-soft)`,
    badge: `bg-(--app-success-text)/10 text-(--app-success-text)`,
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
          {title ? <p className="text-sm font-semibold text-(--app-text)">{title}</p> : null}
          <div className="mt-1 text-sm leading-7 text-(--app-text-soft)">{children}</div>
        </div>
      </div>
    </aside>
  );
}
