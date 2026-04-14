import Link from 'next/link';

import { SearchIcon } from '@remoola/ui';

import { type PublicHelpGuideRegistryEntry } from '../../../features/help/guide-registry';
import { helpGuideFeatureLabels, helpGuideTypeLabels, helpHubData } from '../../../features/help/help-hub-data';
import { HelpHubBrowseClient } from '../../../features/help/ui/HelpHubBrowseClient';
import { PageHeader, Panel } from '../../../shared/ui/shell-primitives';

function GuideCard({
  guide,
  categoryLabel,
  href,
}: {
  guide: PublicHelpGuideRegistryEntry;
  categoryLabel: string;
  href: string;
}) {
  const visibleRoutes = guide.routeAffinity.slice(0, 2);
  const remainingRouteCount = guide.routeAffinity.length - visibleRoutes.length;

  return (
    <article className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--app-primary)]">
          {helpGuideTypeLabels[guide.guideType]}
        </span>
        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
          {categoryLabel}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-[var(--app-text)]">{guide.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{guide.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {visibleRoutes.map((route) => (
          <span
            key={route}
            className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs text-[var(--app-text-faint)]"
          >
            {route}
          </span>
        ))}
        {remainingRouteCount > 0 ? (
          <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs text-[var(--app-text-faint)]">
            +{remainingRouteCount} more pages
          </span>
        ) : null}
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-[var(--app-primary-contrast)]"
      >
        Read guide
      </Link>
    </article>
  );
}

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help Center"
        subtitle="Browse guidance by product area and find the best place to start for your next task."
        icon={<SearchIcon size={40} className="h-10 w-10 text-white" />}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Start here" aside={`${helpHubData.startHereGuides.length} recommended guides`}>
          <div className="space-y-4">
            <p className="text-sm leading-7 text-[var(--app-text-soft)]">
              Use these guides first if you are getting oriented, checking payments, or reviewing account status in the
              workspace.
            </p>

            <div className="space-y-3">
              {helpHubData.startHereGuides.map((guide) => {
                const categorySection = helpHubData.categories.find((section) => section.category === guide.category);

                if (!categorySection) {
                  return null;
                }

                return (
                  <Link
                    key={guide.slug}
                    href={`/help/${guide.slug}`}
                    className="block rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4 transition hover:border-[color:var(--app-primary)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--app-primary)]">
                        {helpGuideTypeLabels[guide.guideType]}
                      </span>
                      <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
                        {categorySection.label}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[var(--app-text)]">{guide.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{guide.summary}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="Help at a glance"
          aside={`${helpHubData.totalGuideCount} guides across ${helpHubData.coveredCategoryCount} topics`}
        >
          <p className="text-sm leading-7 text-[var(--app-text-soft)]">
            Use this overview to see how the Help Center is organized and which parts of the workspace already have
            dedicated guidance.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <div className="text-2xl font-semibold text-[var(--app-text)]">{helpHubData.totalGuideCount}</div>
              <div className="mt-1 text-sm text-[var(--app-text-soft)]">Available guides</div>
            </div>
            <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <div className="text-2xl font-semibold text-[var(--app-text)]">{helpHubData.routeAffinityCount}</div>
              <div className="mt-1 text-sm text-[var(--app-text-soft)]">Workspace pages linked</div>
            </div>
            <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <div className="text-2xl font-semibold text-[var(--app-text)]">{helpHubData.coveredCategoryCount}</div>
              <div className="mt-1 text-sm text-[var(--app-text-soft)]">Topics to browse</div>
            </div>
            <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <div className="text-2xl font-semibold text-[var(--app-text)]">{helpHubData.coveredFeatureCount}</div>
              <div className="mt-1 text-sm text-[var(--app-text-soft)]">Task areas included</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
              Topics covered here
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {helpHubData.featureLabels.map((featureLabel) => (
                <span
                  key={featureLabel}
                  className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1 text-xs text-[var(--app-text-soft)]"
                >
                  {featureLabel}
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <HelpHubBrowseClient />

      <section className="mt-5">
        <Panel title="Featured guides" aside="Good places to start">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {helpHubData.featuredGuides.map((guide) => {
              const categorySection = helpHubData.categories.find((section) => section.category === guide.category);

              if (!categorySection) {
                return null;
              }

              return (
                <GuideCard
                  key={guide.slug}
                  guide={guide}
                  categoryLabel={categorySection.label}
                  href={`/help/${guide.slug}`}
                />
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel title="Browse by category" aside={`${helpHubData.categories.length} sections`}>
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {helpHubData.categories.map((section) => (
              <section
                key={section.category}
                id={section.anchorId}
                className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--app-text)]">{section.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{section.description}</p>
                  </div>
                  <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
                    {section.guides.length} guides
                  </span>
                </div>

                {section.guides.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {section.guides.map((guide) => (
                      <article
                        key={guide.slug}
                        className="rounded-[20px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--app-primary)]">
                            {helpGuideTypeLabels[guide.guideType]}
                          </span>
                          <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs text-[var(--app-text-soft)]">
                            {helpGuideFeatureLabels[guide.feature]}
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-[var(--app-text)]">{guide.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--app-text-soft)]">{guide.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {guide.routeAffinity.map((route) => (
                            <span
                              key={route}
                              className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-1 text-xs text-[var(--app-text-faint)]"
                            >
                              {route}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/help/${guide.slug}`}
                          className="mt-4 inline-flex rounded-full bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-[var(--app-primary-contrast)]"
                        >
                          Read guide
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 text-sm leading-6 text-[var(--app-text-soft)]">
                    There is not a dedicated guide in this section yet. Use search above or browse a related topic to
                    find the closest match for {section.label.toLowerCase()}.
                  </div>
                )}
              </section>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
