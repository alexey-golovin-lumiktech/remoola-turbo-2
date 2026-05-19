import { type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_SOURCE_REF_KIND, type HelpGuideSourceMapEntry, type HelpGuideSourceRef } from '../guide-types';

function toImplementationSourceRefs(entry: HelpGuideSourceMapEntry<HelpGuideSlug>): readonly HelpGuideSourceRef[] {
  return [
    ...entry.routes.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_ROUTE,
      ref,
    })),
    ...entry.frontendFiles.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_FILE,
      ref,
    })),
    ...entry.frontendDataHelpers.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_FILE,
      ref,
      note: `Frontend data helper`,
    })),
    ...entry.backendSurfaces.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.API_SURFACE,
      ref,
      note: `Backend surface`,
    })),
    ...entry.sharedContracts.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.SHARED_CONTRACT,
      ref,
    })),
  ];
}

export function makeGetGuideSourceRefs(sourceMap: readonly HelpGuideSourceMapEntry<HelpGuideSlug>[]) {
  const helpGuideSourceMapBySlug: Record<HelpGuideSlug, HelpGuideSourceMapEntry<HelpGuideSlug>> = sourceMap.reduce(
    (accumulator, entry) => {
      accumulator[entry.slug] = entry;
      return accumulator;
    },
    {} as Record<HelpGuideSlug, HelpGuideSourceMapEntry<HelpGuideSlug>>,
  );

  return function getGuideSourceRefs(slug: HelpGuideSlug): readonly HelpGuideSourceRef[] {
    return toImplementationSourceRefs(helpGuideSourceMapBySlug[slug]);
  };
}
