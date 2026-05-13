import Link from 'next/link';

import { cn } from '@remoola/ui';

import { type PublicHelpGuideRegistryEntry } from '../guide-registry';
import { helpGuideTypeLabels } from '../help-hub-data';

interface HelpInlineGuidesProps {
  guides: readonly PublicHelpGuideRegistryEntry[];
  title?: string;
  className?: string;
  showHubLink?: boolean;
}

export function HelpInlineGuides({
  guides,
  title = `Need help with this step?`,
  className,
  showHubLink = false,
}: HelpInlineGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <section className={cn(`rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3`, className)}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-(--app-text)">{title}</span>
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/help/${guide.slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-1.5 text-xs text-(--app-text-soft) transition hover:border-(--app-primary) hover:text-(--app-text)"
          >
            <span className="font-medium text-(--app-primary)">{helpGuideTypeLabels[guide.guideType]}</span>
            <span>{guide.title}</span>
          </Link>
        ))}
        {showHubLink ? (
          <Link
            href="/help"
            className="text-nowrap inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-(--app-primary) transition hover:text-(--app-primary-strong)"
          >
            Open help hub
          </Link>
        ) : null}
      </div>
    </section>
  );
}
