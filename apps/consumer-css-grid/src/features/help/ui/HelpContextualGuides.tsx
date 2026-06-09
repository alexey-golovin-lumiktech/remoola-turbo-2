import Link from 'next/link';

import { cn } from '@remoola/ui';

import { shellBadgePrimary } from '../../../shared/ui/shell-card-tokens';
import { type PublicHelpGuideRegistryEntry } from '../guide-registry';
import { helpGuideTypeLabels } from '../help-hub-data';

interface HelpContextualGuidesProps {
  guides: readonly PublicHelpGuideRegistryEntry[];
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function HelpContextualGuides({
  guides,
  title = `Need help?`,
  description = `Open the most relevant guide for this part of the workspace without leaving your current flow.`,
  compact = false,
  className,
}: HelpContextualGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        `rounded-[24px] border border-(--app-border) bg-(--app-surface-muted)`,
        compact ? `p-4` : `p-5`,
        className,
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--app-primary)">Contextual help</div>
          <h3 className={cn(`mt-2 font-semibold text-(--app-text)`, compact ? `text-base` : `text-lg`)}>{title}</h3>
          <p
            className={cn(`mt-2 max-w-3xl text-(--app-text-soft)`, compact ? `text-sm leading-6` : `text-sm leading-7`)}
          >
            {description}
          </p>
        </div>
        <Link
          href="/help"
          className="text-nowrap inline-flex rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-soft) transition hover:text-(--app-text)"
        >
          Open help hub
        </Link>
      </div>

      <div className={cn(`mt-4 grid gap-3`, compact ? `md:grid-cols-2` : `xl:grid-cols-3`)}>
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/help/${guide.slug}`}
            className={cn(
              `rounded-[20px] border border-(--app-border) bg-(--app-surface) transition hover:border-(--app-primary) hover:bg-(--app-surface-muted)`,
              compact ? `p-3` : `p-4`,
            )}
          >
            <span className={shellBadgePrimary}>{helpGuideTypeLabels[guide.guideType]}</span>
            <h4 className={cn(`font-semibold text-(--app-text)`, compact ? `mt-3 text-sm` : `mt-4 text-base`)}>
              {guide.title}
            </h4>
            <p className={cn(`text-(--app-text-soft)`, compact ? `mt-2 text-xs leading-6` : `mt-2 text-sm leading-6`)}>
              {guide.summary}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
