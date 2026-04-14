import { cn } from '@remoola/ui';

import { HelpSection } from './HelpSection';

export interface HelpStepItem {
  title: string;
  body?: string;
  outcome?: string;
  note?: string;
}

interface HelpStepsProps {
  items: readonly HelpStepItem[];
  title?: string;
  description?: string;
  className?: string;
}

export function HelpSteps({ items, title = `Step-by-step instructions`, description, className }: HelpStepsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <HelpSection title={title} description={description} className={className}>
      <ol className="space-y-4">
        {items.map((item, index) => (
          <li
            key={`${index + 1}-${item.title}`}
            className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
          >
            <div className="flex gap-4">
              <span
                aria-hidden="true"
                className={cn(
                  `flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-sm font-semibold text-[var(--app-primary-contrast)]`,
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[var(--app-text)]">{item.title}</h4>
                {item.body ? <p className="mt-2 text-sm leading-7 text-[var(--app-text-soft)]">{item.body}</p> : null}
                {item.outcome ? (
                  <p className="mt-3 rounded-xl bg-[var(--app-surface)] px-3 py-2 text-sm leading-6 text-[var(--app-text-muted)]">
                    <span className="font-medium text-[var(--app-text)]">Expected result:</span> {item.outcome}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--app-text-faint)]">
                    Note: {item.note}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </HelpSection>
  );
}
