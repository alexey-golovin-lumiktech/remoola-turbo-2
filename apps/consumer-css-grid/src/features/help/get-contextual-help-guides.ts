import { publicHelpGuideRegistry, type PublicHelpGuideRegistryEntry, type HelpGuideSlug } from './guide-registry';
import {
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideFeature,
  type HelpGuideType,
  type HelpRouteAffinity,
} from './guide-types';

export const HELP_CONTEXT_ROUTE = {
  DASHBOARD: `/dashboard`,
  PAYMENTS: `/payments`,
  PAYMENTS_NEW_REQUEST: `/payments/new-request`,
  PAYMENTS_START: `/payments/start`,
  PAYMENTS_DETAIL: `/payments/[paymentRequestId]`,
  DOCUMENTS: `/documents`,
  CONTACTS: `/contacts`,
  CONTRACTS: `/contracts`,
  BANKING: `/banking`,
  WITHDRAW: `/withdraw`,
  EXCHANGE: `/exchange`,
  EXCHANGE_RULES: `/exchange/rules`,
  EXCHANGE_SCHEDULED: `/exchange/scheduled`,
  SETTINGS: `/settings`,
} as const satisfies Record<string, HelpRouteAffinity>;

interface GetContextualHelpGuidesOptions {
  route: HelpRouteAffinity;
  limit?: number;
  preferredSlugs?: readonly HelpGuideSlug[];
  excludedSlugs?: readonly HelpGuideSlug[];
  guideTypes?: readonly HelpGuideType[];
}

const contextualGuideTypePriority: Record<HelpGuideType, number> = {
  [HELP_GUIDE_TYPE.OVERVIEW]: 0,
  [HELP_GUIDE_TYPE.TASK]: 1,
  [HELP_GUIDE_TYPE.TROUBLESHOOTING]: 2,
};

function getPreferredIndex(slug: HelpGuideSlug, preferredSlugs: readonly HelpGuideSlug[]) {
  const index = preferredSlugs.indexOf(slug);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function matchesRoute(guide: PublicHelpGuideRegistryEntry, route: HelpRouteAffinity) {
  return guide.routeAffinity.some((affinity) => affinity === route);
}

function getPrimaryFeatureForRoute(route: HelpRouteAffinity): HelpGuideFeature | null {
  const routeFeatureMap: Partial<Record<HelpRouteAffinity, HelpGuideFeature>> = {
    [HELP_CONTEXT_ROUTE.DASHBOARD]: HELP_GUIDE_FEATURE.DASHBOARD,
    [HELP_CONTEXT_ROUTE.PAYMENTS]: HELP_GUIDE_FEATURE.PAYMENTS,
    [HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST]: HELP_GUIDE_FEATURE.PAYMENTS,
    [HELP_CONTEXT_ROUTE.PAYMENTS_START]: HELP_GUIDE_FEATURE.PAYMENTS,
    [HELP_CONTEXT_ROUTE.PAYMENTS_DETAIL]: HELP_GUIDE_FEATURE.PAYMENTS,
    [HELP_CONTEXT_ROUTE.DOCUMENTS]: HELP_GUIDE_FEATURE.DOCUMENTS,
    [HELP_CONTEXT_ROUTE.CONTACTS]: HELP_GUIDE_FEATURE.CONTACTS,
    [HELP_CONTEXT_ROUTE.CONTRACTS]: HELP_GUIDE_FEATURE.CONTRACTS,
    [HELP_CONTEXT_ROUTE.BANKING]: HELP_GUIDE_FEATURE.BANKING,
    [HELP_CONTEXT_ROUTE.WITHDRAW]: HELP_GUIDE_FEATURE.WITHDRAWAL,
    [HELP_CONTEXT_ROUTE.EXCHANGE]: HELP_GUIDE_FEATURE.EXCHANGE,
    [HELP_CONTEXT_ROUTE.EXCHANGE_RULES]: HELP_GUIDE_FEATURE.EXCHANGE,
    [HELP_CONTEXT_ROUTE.EXCHANGE_SCHEDULED]: HELP_GUIDE_FEATURE.EXCHANGE,
    [HELP_CONTEXT_ROUTE.SETTINGS]: HELP_GUIDE_FEATURE.SETTINGS,
  };

  return routeFeatureMap[route] ?? null;
}

function getFeaturePriority(guide: PublicHelpGuideRegistryEntry, route: HelpRouteAffinity) {
  const primaryFeature = getPrimaryFeatureForRoute(route);

  if (!primaryFeature) {
    return guide.feature === HELP_GUIDE_FEATURE.WORKSPACE ? 1 : 0;
  }

  if (guide.feature === primaryFeature) {
    return 0;
  }

  if (guide.feature === HELP_GUIDE_FEATURE.WORKSPACE) {
    return 2;
  }

  return 1;
}

export function getContextualHelpGuides({
  route,
  limit = 3,
  preferredSlugs = [],
  excludedSlugs = [],
  guideTypes,
}: GetContextualHelpGuidesOptions): PublicHelpGuideRegistryEntry[] {
  const excluded = new Set<HelpGuideSlug>(excludedSlugs);
  const preferred = new Set<HelpGuideSlug>(preferredSlugs);
  const guideTypeFilter = guideTypes ? new Set<HelpGuideType>(guideTypes) : null;

  return publicHelpGuideRegistry
    .filter((guide) => {
      if (excluded.has(guide.slug)) {
        return false;
      }

      if (guideTypeFilter && !guideTypeFilter.has(guide.guideType)) {
        return false;
      }

      return preferred.has(guide.slug) || matchesRoute(guide, route);
    })
    .slice()
    .sort((left, right) => {
      const leftPreferredIndex = getPreferredIndex(left.slug, preferredSlugs);
      const rightPreferredIndex = getPreferredIndex(right.slug, preferredSlugs);

      if (leftPreferredIndex !== rightPreferredIndex) {
        return leftPreferredIndex - rightPreferredIndex;
      }

      const leftRouteMatch = matchesRoute(left, route) ? 0 : 1;
      const rightRouteMatch = matchesRoute(right, route) ? 0 : 1;

      if (leftRouteMatch !== rightRouteMatch) {
        return leftRouteMatch - rightRouteMatch;
      }

      const leftFeaturePriority = getFeaturePriority(left, route);
      const rightFeaturePriority = getFeaturePriority(right, route);

      if (leftFeaturePriority !== rightFeaturePriority) {
        return leftFeaturePriority - rightFeaturePriority;
      }

      const leftTypePriority = contextualGuideTypePriority[left.guideType];
      const rightTypePriority = contextualGuideTypePriority[right.guideType];

      if (leftTypePriority !== rightTypePriority) {
        return leftTypePriority - rightTypePriority;
      }

      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}
