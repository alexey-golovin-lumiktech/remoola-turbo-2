'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { cn } from '@remoola/ui';

import { type HelpGuideFeature } from '../guide-types';
import {
  getHelpGuideSearchTokens,
  helpGuideFeatureLabels,
  helpGuideTypeLabels,
  helpHubData,
  searchHelpGuides,
} from '../help-hub-data';

const RESULT_LIMIT = 8;

function SearchResultCard({
  href,
  title,
  summary,
  guideTypeLabel,
  categoryLabel,
  featureLabel,
}: {
  href: string;
  title: string;
  summary: string;
  guideTypeLabel: string;
  categoryLabel: string;
  featureLabel: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[color:var(--app-primary)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--app-primary)]">
          {guideTypeLabel}
        </span>
        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
          {categoryLabel}
        </span>
        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs text-[var(--app-text-faint)]">
          {featureLabel}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{summary}</p>
    </Link>
  );
}

export function HelpHubBrowseClient() {
  const [query, setQuery] = useState(``);
  const [selectedFeature, setSelectedFeature] = useState<HelpGuideFeature | `all`>(`all`);

  const activeSearchTokens = getHelpGuideSearchTokens(query);
  const isFiltering = activeSearchTokens.length > 0 || selectedFeature !== `all`;

  const matchingEntries = useMemo(
    () => searchHelpGuides(query, selectedFeature === `all` ? null : selectedFeature),
    [query, selectedFeature],
  );
  const visibleEntries = matchingEntries.slice(0, RESULT_LIMIT);

  return (
    <section className="mt-5">
      <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-primary)]">
              Browse and search
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[var(--app-text)]">Find the right guide faster</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--app-text-soft)]">
              Filter by topic or search by keyword to jump straight to the right guide without scanning the full help
              index.
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm text-[var(--app-text-soft)]">
            {matchingEntries.length} guide{matchingEntries.length === 1 ? `` : `s`} visible
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
              Search by keyword
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Try payments, upload, verification, settings..."
              className="mt-2 w-full rounded-[20px] border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[color:var(--app-primary)]"
            />
          </label>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
              Browse by topic
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedFeature(`all`)}
                className={cn(
                  `rounded-full border px-3 py-2 text-sm transition`,
                  selectedFeature === `all`
                    ? `border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]`
                    : `border-[color:var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-soft)] hover:text-[var(--app-text)]`,
                )}
              >
                All topics
              </button>
              {helpHubData.coveredFeatureSections.map((section) => (
                <button
                  key={section.feature}
                  type="button"
                  onClick={() => setSelectedFeature(section.feature)}
                  className={cn(
                    `rounded-full border px-3 py-2 text-sm transition`,
                    selectedFeature === section.feature
                      ? `border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]`
                      : `border-[color:var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-soft)] hover:text-[var(--app-text)]`,
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isFiltering ? (
          <div className="mt-5">
            {visibleEntries.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-[var(--app-text-soft)]">
                  Showing {visibleEntries.length} of {matchingEntries.length} matching guide
                  {matchingEntries.length === 1 ? `` : `s`}.
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {visibleEntries.map((entry) => (
                    <SearchResultCard
                      key={entry.guide.slug}
                      href={`/help/${entry.guide.slug}`}
                      title={entry.guide.title}
                      summary={entry.guide.summary}
                      guideTypeLabel={helpGuideTypeLabels[entry.guide.guideType]}
                      categoryLabel={entry.categoryLabel}
                      featureLabel={entry.featureLabel}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[color:var(--app-border)] bg-[var(--app-surface)] p-5">
                <div className="text-base font-semibold text-[var(--app-text)]">No guides match this search</div>
                <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">
                  Try a broader keyword, clear the feature filter, or use the category browse below to keep exploring.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {helpHubData.coveredFeatureSections.map((section) => (
              <article
                key={section.feature}
                id={section.anchorId}
                className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--app-text)]">{section.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{section.description}</p>
                  </div>
                  <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
                    {section.guides.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {section.guides.slice(0, 3).map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/help/${guide.slug}`}
                      className="block rounded-[20px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4 transition hover:border-[color:var(--app-primary)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--app-primary)]">
                          {helpGuideTypeLabels[guide.guideType]}
                        </span>
                        <span className="text-xs text-[var(--app-text-faint)]">
                          {helpGuideFeatureLabels[guide.feature]}
                        </span>
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-[var(--app-text)]">{guide.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{guide.summary}</p>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
