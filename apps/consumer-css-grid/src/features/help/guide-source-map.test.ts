import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { getGuideSourceRefs, helpGuideSourceMap } from './guide-source-map';
import { HELP_GUIDE_FEATURE, HELP_GUIDE_SOURCE_REF_KIND, HELP_GUIDE_TYPE, type HelpRouteAffinity } from './guide-types';
import { helpGuideRegistry, helpGuideRegistryBySlug } from './internal-guide-registry';

const repoRoot = resolve(__dirname, `../../../../..`);
const appRouteRoots = [
  `apps/consumer-css-grid/src/app/(shell)`,
  `apps/consumer-css-grid/src/app/(auth)`,
  `apps/consumer-css-grid/src/app`,
] as const;
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
const fullyCoveredGuideTypes = [
  HELP_GUIDE_TYPE.OVERVIEW,
  HELP_GUIDE_TYPE.TASK,
  HELP_GUIDE_TYPE.TROUBLESHOOTING,
] as const;

function toRoutePageCandidates(route: HelpRouteAffinity) {
  const normalizedRoute = route === `/` ? `` : route.replace(/^\//, ``);
  const routePagePath = normalizedRoute ? `${normalizedRoute}/page.tsx` : `page.tsx`;

  return appRouteRoots.map((root) => resolve(repoRoot, root, routePagePath));
}

describe(`guide source map`, () => {
  it(`keeps source-map coverage aligned with the runtime registry`, () => {
    const sourceMapSlugs = helpGuideSourceMap.map((entry) => entry.slug).sort();
    const registrySlugs = helpGuideRegistry.map((entry) => entry.slug).sort();

    expect(sourceMapSlugs).toEqual(registrySlugs);

    for (const entry of helpGuideSourceMap) {
      expect(helpGuideRegistryBySlug[entry.slug].feature).toBe(entry.feature);
      expect(helpGuideRegistryBySlug[entry.slug].sourceRefs).toEqual(getGuideSourceRefs(entry.slug));
    }
  });

  it(`keeps route affinity aligned between the registry and source map`, () => {
    for (const entry of helpGuideSourceMap) {
      const registryGuide = helpGuideRegistryBySlug[entry.slug];

      expect([...entry.routes].sort()).toEqual([...registryGuide.routeAffinity].sort());
    }
  });

  it(`keeps closure-complete feature families in full source-map parity`, () => {
    for (const feature of closureCompleteFamilyFeatures) {
      const registryGuides = helpGuideRegistry.filter((guide) => guide.feature === feature);
      const sourceMapEntries = helpGuideSourceMap.filter((entry) => entry.feature === feature);

      expect(sourceMapEntries.map((entry) => entry.slug).sort()).toEqual(
        registryGuides.map((guide) => guide.slug).sort(),
      );
      expect(
        [...new Set(registryGuides.map((guide) => guide.guideType))].sort(
          (left, right) => fullyCoveredGuideTypes.indexOf(left) - fullyCoveredGuideTypes.indexOf(right),
        ),
      ).toEqual([...fullyCoveredGuideTypes]);
    }
  });

  it(`gives every guide at least one route and one implementation anchor`, () => {
    for (const entry of helpGuideSourceMap) {
      const implementationAnchorCount =
        entry.frontendFiles.length +
        entry.frontendDataHelpers.length +
        entry.backendSurfaces.length +
        entry.sharedContracts.length;

      expect(entry.routes.length).toBeGreaterThan(0);
      expect(implementationAnchorCount).toBeGreaterThan(0);
    }
  });

  it(`only references files that currently exist`, () => {
    const fileBackedKinds: ReadonlySet<string> = new Set([
      HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_FILE,
      HELP_GUIDE_SOURCE_REF_KIND.API_SURFACE,
      HELP_GUIDE_SOURCE_REF_KIND.SHARED_CONTRACT,
    ]);

    for (const guide of helpGuideRegistry) {
      for (const ref of guide.sourceRefs) {
        if (!fileBackedKinds.has(ref.kind)) {
          continue;
        }

        expect(existsSync(resolve(repoRoot, ref.ref))).toBe(true);
      }
    }
  });

  it(`keeps planning docs out of runtime source refs`, () => {
    for (const guide of helpGuideRegistry) {
      expect(guide.sourceRefs.some((ref) => ref.kind === HELP_GUIDE_SOURCE_REF_KIND.PLANNING_DOC)).toBe(false);
    }
  });

  it(`only references route affinities that resolve to a real app route surface`, () => {
    for (const entry of helpGuideSourceMap) {
      for (const route of entry.routes) {
        const candidateRouteFiles = toRoutePageCandidates(route);
        const matchingRouteFile = candidateRouteFiles.find((candidate) => existsSync(candidate));

        expect(matchingRouteFile).toBeDefined();
      }
    }
  });

  it(`keeps every related guide slug resolvable`, () => {
    for (const guide of helpGuideRegistry) {
      for (const relatedSlug of guide.relatedGuides) {
        expect(helpGuideRegistryBySlug[relatedSlug]).toBeDefined();
      }
    }
  });
});
