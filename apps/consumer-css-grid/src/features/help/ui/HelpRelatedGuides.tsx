import Link from 'next/link';

import { cn } from '@remoola/ui';

import { publicHelpGuideRegistryBySlug, type HelpGuideSlug } from '../guide-registry';
import { helpGuideCategoryLabels, helpGuideTypeLabels } from '../help-hub-data';
import { HelpSection } from './HelpSection';

interface HelpRelatedGuidesProps {
  slugs: readonly HelpGuideSlug[];
  title?: string;
  description?: string;
  resolveHref?: (slug: HelpGuideSlug) => string;
  className?: string;
}

export function HelpRelatedGuides({
  slugs,
  title = `Related guides`,
  description,
  resolveHref = (slug) => `/help/${slug}`,
  className,
}: HelpRelatedGuidesProps) {
  if (slugs.length === 0) {
    return null;
  }

  return (
    <HelpSection title={title} description={description} className={className}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {slugs.map((slug) => {
          const guide = publicHelpGuideRegistryBySlug[slug];

          return (
            <Link
              key={slug}
              href={resolveHref(slug)}
              className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4 transition hover:bg-[var(--app-surface)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    `rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-primary)]`,
                  )}
                >
                  {helpGuideTypeLabels[guide.guideType]}
                </span>
                <span className="text-xs text-[var(--app-text-faint)]">{helpGuideCategoryLabels[guide.category]}</span>
              </div>
              <h4 className="mt-3 text-base font-semibold text-[var(--app-text)]">{guide.title}</h4>
              <p className="mt-2 text-sm leading-7 text-[var(--app-text-soft)]">{guide.summary}</p>
            </Link>
          );
        })}
      </div>
    </HelpSection>
  );
}
