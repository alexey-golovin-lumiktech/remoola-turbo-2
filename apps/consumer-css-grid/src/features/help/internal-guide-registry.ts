import { publicHelpGuideRegistry, type HelpGuideSlug } from './guide-registry';
import { getGuideSourceRefs } from './guide-source-map';

import type { InternalHelpGuideMeta } from './guide-types';

export type HelpGuideRegistryEntry = InternalHelpGuideMeta<HelpGuideSlug>;

export const helpGuideRegistry: readonly HelpGuideRegistryEntry[] = publicHelpGuideRegistry.map((guide) => ({
  ...guide,
  sourceRefs: getGuideSourceRefs(guide.slug),
}));

export const helpGuideRegistryBySlug: Record<HelpGuideSlug, HelpGuideRegistryEntry> = helpGuideRegistry.reduce(
  (accumulator, guide) => {
    accumulator[guide.slug] = guide;
    return accumulator;
  },
  {} as Record<HelpGuideSlug, HelpGuideRegistryEntry>,
);
