import { cn } from '@remoola/ui';

import { HelpSection } from './HelpSection';
import { shellContainerBase } from '../../../shared/ui/shell-card-tokens';

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
          <li key={`${index + 1}-${item.title}`} className={shellContainerBase}>
            <div className="flex gap-4">
              <span
                aria-hidden="true"
                className={cn(
                  `flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--app-primary) text-sm font-semibold text-(--app-primary-contrast)`,
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-(--app-text)">{item.title}</h4>
                {item.body ? <p className="mt-2 text-sm leading-7 text-(--app-text-soft)">{item.body}</p> : null}
                {item.outcome ? (
                  <p className="mt-3 rounded-xl bg-(--app-surface) px-3 py-2 text-sm leading-6 text-(--app-text-muted)">
                    <span className="font-medium text-(--app-text)">Expected result:</span> {item.outcome}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-(--app-text-faint)">Note: {item.note}</p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </HelpSection>
  );
}
