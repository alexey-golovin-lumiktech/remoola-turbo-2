import { cn } from '@remoola/ui';

import { HelpSection } from './HelpSection';

interface HelpPrerequisitesProps {
  items: readonly string[];
  title?: string;
  description?: string;
  className?: string;
}

export function HelpPrerequisites({
  items,
  title = `Before you start`,
  description,
  className,
}: HelpPrerequisitesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <HelpSection title={title} description={description} className={className}>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm leading-7 text-[var(--app-text-soft)]"
          >
            <span
              aria-hidden="true"
              className={cn(
                `mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-xs font-semibold text-[var(--app-primary)]`,
              )}
            >
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </HelpSection>
  );
}
