import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SearchIcon } from '@remoola/ui';

import { getGuideBySlug } from '../../../../features/help/get-guide-by-slug';
import {
  helpGuideCategoryLabels,
  helpGuideFeatureLabels,
  helpGuideTypeLabels,
} from '../../../../features/help/help-hub-data';
import { HelpGuideDetailArticle } from '../../../../features/help/ui';
import { PageHeader, Panel } from '../../../../shared/ui/shell-primitives';

const helpAudienceStateLabels = {
  guest: `Guest users`,
  authenticated: `Signed-in users`,
  both: `All users`,
} as const;

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
      {children}
    </span>
  );
}

export default async function HelpGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getGuideBySlug(slug);

  if (!detail) {
    notFound();
  }

  const { guide, content } = detail;

  return (
    <div>
      <PageHeader
        title="Help Center"
        subtitle="Read detailed guidance for a specific consumer workflow and follow the next safe action."
        icon={<SearchIcon size={40} className="h-10 w-10 text-white" />}
        action={
          <Link
            href="/help"
            className="inline-flex rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text)]"
          >
            Back to all guides
          </Link>
        }
      />

      <div className="mb-5">
        <Link href="/help" className="text-sm text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]">
          Back to help hub
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <HelpGuideDetailArticle guide={guide} content={content} />

        <div className="space-y-5">
          <Panel title="Guide details">
            <div className="flex flex-wrap gap-2">
              <MetaChip>{helpGuideTypeLabels[guide.guideType]}</MetaChip>
              <MetaChip>{helpGuideCategoryLabels[guide.category]}</MetaChip>
              <MetaChip>{helpGuideFeatureLabels[guide.feature]}</MetaChip>
              <MetaChip>{helpAudienceStateLabels[guide.audienceState]}</MetaChip>
            </div>
          </Panel>

          <Panel title="Relevant workspace routes" aside={`${guide.routeAffinity.length} linked`}>
            <div className="flex flex-wrap gap-2">
              {guide.routeAffinity.map((route) => (
                <MetaChip key={route}>{route}</MetaChip>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
