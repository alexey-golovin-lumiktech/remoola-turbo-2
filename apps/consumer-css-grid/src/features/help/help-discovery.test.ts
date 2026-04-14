import { describe, expect, it } from '@jest/globals';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from './get-contextual-help-guides';
import { getGuideBySlug } from './get-guide-by-slug';
import { HELP_GUIDE_SLUG } from './guide-registry';
import { helpGuideSourceMap } from './guide-source-map';
import { HELP_GUIDE_CATEGORY, HELP_GUIDE_FEATURE, HELP_GUIDE_TYPE } from './guide-types';
import { getHelpGuideFamilyCoverage, helpHubData, searchHelpGuides } from './help-hub-data';
import { helpGuideRegistry, helpGuideRegistryBySlug } from './internal-guide-registry';

const closureCompleteFamilyFeatures = [
  HELP_GUIDE_FEATURE.DASHBOARD,
  HELP_GUIDE_FEATURE.PAYMENTS,
  HELP_GUIDE_FEATURE.DOCUMENTS,
  HELP_GUIDE_FEATURE.CONTACTS,
  HELP_GUIDE_FEATURE.CONTRACTS,
  HELP_GUIDE_FEATURE.BANKING,
  HELP_GUIDE_FEATURE.WITHDRAWAL,
  HELP_GUIDE_FEATURE.EXCHANGE,
  HELP_GUIDE_FEATURE.SETTINGS,
  HELP_GUIDE_FEATURE.VERIFICATION,
] as const;

const finalActiveContextualRoutes = [
  HELP_CONTEXT_ROUTE.DASHBOARD,
  HELP_CONTEXT_ROUTE.PAYMENTS,
  HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST,
  HELP_CONTEXT_ROUTE.PAYMENTS_START,
  HELP_CONTEXT_ROUTE.PAYMENTS_DETAIL,
  HELP_CONTEXT_ROUTE.DOCUMENTS,
  HELP_CONTEXT_ROUTE.CONTACTS,
  HELP_CONTEXT_ROUTE.CONTRACTS,
  HELP_CONTEXT_ROUTE.BANKING,
  HELP_CONTEXT_ROUTE.WITHDRAW,
  HELP_CONTEXT_ROUTE.EXCHANGE,
  HELP_CONTEXT_ROUTE.EXCHANGE_RULES,
  HELP_CONTEXT_ROUTE.EXCHANGE_SCHEDULED,
  HELP_CONTEXT_ROUTE.SETTINGS,
] as const;

function expectFullFamilyCoverage(
  feature: (typeof closureCompleteFamilyFeatures)[number],
  label: string,
  guideCount: number,
) {
  expect(getHelpGuideFamilyCoverage(feature)).toEqual({
    feature,
    label,
    guideCount,
    presentGuideTypes: [HELP_GUIDE_TYPE.OVERVIEW, HELP_GUIDE_TYPE.TASK, HELP_GUIDE_TYPE.TROUBLESHOOTING],
    missingGuideTypes: [],
  });
}

describe(`help discovery`, () => {
  it(`keeps the public registry export path free of internal source-map helpers`, async () => {
    const publicRegistryModule = await import(`./guide-registry`);
    const internalRegistryModule = await import(`./internal-guide-registry`);

    expect(Object.prototype.hasOwnProperty.call(publicRegistryModule, `helpGuideRegistry`)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(publicRegistryModule, `helpGuideRegistryBySlug`)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(internalRegistryModule, `helpGuideRegistry`)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(internalRegistryModule, `helpGuideRegistryBySlug`)).toBe(true);
  });

  it(`supports simple metadata search across titles and summaries`, () => {
    expect(searchHelpGuides(`payment statuses`).map((entry) => entry.guide.slug)[0]).toBe(
      HELP_GUIDE_SLUG.PAYMENTS_STATUSES,
    );
    expect(searchHelpGuides(`upload attach`).map((entry) => entry.guide.slug)[0]).toBe(
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
    );
  });

  it(`supports browse by feature without mixing in unrelated guides`, () => {
    const results = searchHelpGuides(``, HELP_GUIDE_FEATURE.SETTINGS);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.guide.feature === HELP_GUIDE_FEATURE.SETTINGS)).toBe(true);
    expect(results.map((entry) => entry.guide.slug)).toEqual([
      HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
      HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
    ]);
  });

  it(`supports browse by exchange feature with the full family present`, () => {
    const results = searchHelpGuides(``, HELP_GUIDE_FEATURE.EXCHANGE);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.guide.feature === HELP_GUIDE_FEATURE.EXCHANGE)).toBe(true);
    expect(results.map((entry) => entry.guide.slug)).toEqual([
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ]);
  });

  it(`keeps discovery and detail helpers on the public-safe metadata contract`, () => {
    const searchResult = searchHelpGuides(`payment statuses`)[0];
    const detail = getGuideBySlug(HELP_GUIDE_SLUG.PAYMENTS_STATUSES);
    const featuredGuide = helpHubData.featuredGuides[0];

    expect(searchResult).toBeDefined();
    expect(detail).not.toBeNull();
    expect(featuredGuide).toBeDefined();

    if (!searchResult || !detail || !featuredGuide) {
      throw new Error(`Expected public help metadata to resolve for search, detail, and featured guides.`);
    }

    expect(Object.prototype.hasOwnProperty.call(searchResult.guide, `sourceRefs`)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(detail.guide, `sourceRefs`)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(featuredGuide, `sourceRefs`)).toBe(false);
  });

  it(`keeps completed feature families fully covered in discovery metadata`, () => {
    expect(helpHubData.coveredCategories.map((section) => section.category)).toEqual(
      Object.values(HELP_GUIDE_CATEGORY),
    );
    expect(helpHubData.coveredFeatureSections.map((section) => section.feature)).toEqual(
      Object.values(HELP_GUIDE_FEATURE),
    );
    expect(helpHubData.coveredCategoryCount).toBe(helpHubData.totalCategoryCount);
    expect(helpHubData.coveredFeatureCount).toBe(helpHubData.totalFeatureCount);
    expect(helpHubData.coverageGaps.missingCategories.map((section) => section.category)).toEqual([]);
    expect(helpHubData.coverageGaps.missingFeatures.map((section) => section.feature)).toEqual([]);
    expect(
      helpHubData.coverageGaps.incompleteFeatureFamilies
        .map((coverage) => coverage.feature)
        .filter((feature) =>
          closureCompleteFamilyFeatures.includes(feature as (typeof closureCompleteFamilyFeatures)[number]),
        ),
    ).toEqual([]);

    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.DASHBOARD, `Dashboard`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.PAYMENTS, `Payments`, 5);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.DOCUMENTS, `Documents`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.CONTACTS, `Contacts`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.CONTRACTS, `Contracts`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.BANKING, `Banking`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.WITHDRAWAL, `Withdrawal`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.EXCHANGE, `Exchange`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.SETTINGS, `Settings`, 3);
    expectFullFamilyCoverage(HELP_GUIDE_FEATURE.VERIFICATION, `Verification`, 3);
  });

  it(`keeps registry and source-map slugs unique and resolvable`, () => {
    const registrySlugs = helpGuideRegistry.map((guide) => guide.slug);
    const sourceMapSlugs = helpGuideSourceMap.map((entry) => entry.slug);

    expect(new Set(registrySlugs).size).toBe(registrySlugs.length);
    expect(new Set(sourceMapSlugs).size).toBe(sourceMapSlugs.length);

    for (const guide of helpGuideRegistry) {
      expect(helpGuideRegistryBySlug[guide.slug]).toBeDefined();
      expect(getGuideBySlug(guide.slug)?.guide.slug).toBe(guide.slug);
    }
  });

  it(`enforces core metadata and related-guide rules`, () => {
    const categoryGuideCount = helpGuideRegistry.reduce(
      (accumulator, guide) => {
        accumulator[guide.category] = (accumulator[guide.category] ?? 0) + 1;
        return accumulator;
      },
      {} as Partial<Record<(typeof helpGuideRegistry)[number][`category`], number>>,
    );

    for (const guide of helpGuideRegistry) {
      expect(guide.summary.trim().length).toBeGreaterThan(0);
      expect(guide.routeAffinity.length).toBeGreaterThan(0);
      expect(guide.relatedGuides.includes(guide.slug)).toBe(false);

      if ((categoryGuideCount[guide.category] ?? 0) > 1) {
        expect(guide.relatedGuides.length).toBeGreaterThan(0);
      }
    }
  });

  it(`keeps contextual help coverage visible for every declared help route`, () => {
    expect(Object.values(HELP_CONTEXT_ROUTE)).toEqual(finalActiveContextualRoutes);

    for (const route of finalActiveContextualRoutes) {
      expect(getContextualHelpGuides({ route, limit: 1 }).length).toBeGreaterThan(0);
    }
  });
});
