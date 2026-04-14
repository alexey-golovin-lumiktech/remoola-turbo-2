import { HelpSection } from './HelpSection';

export interface HelpFaqItem {
  question: string;
  answer: string;
}

interface HelpFaqProps {
  items: readonly HelpFaqItem[];
  title?: string;
  description?: string;
  className?: string;
}

export function HelpFaq({ items, title = `Frequently asked questions`, description, className }: HelpFaqProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <HelpSection title={title} description={description} className={className}>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4"
          >
            <summary className="cursor-pointer list-none pr-8 text-sm font-semibold text-[var(--app-text)]">
              {item.question}
              <span className="ml-3 text-[var(--app-text-faint)] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-[var(--app-text-soft)]">{item.answer}</p>
          </details>
        ))}
      </div>
    </HelpSection>
  );
}
