import { publicHelpGuideRegistry, type PublicHelpGuideRegistryEntry } from './guide-registry';
import {
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideCategory,
  type HelpGuideFeature,
  type HelpGuideType,
} from './guide-types';

interface HelpHubCategoryConfig {
  category: HelpGuideCategory;
  label: string;
  description: string;
}

interface HelpHubFeatureConfig {
  feature: HelpGuideFeature;
  label: string;
  description: string;
}

export interface HelpHubCategorySection extends HelpHubCategoryConfig {
  anchorId: string;
  guides: PublicHelpGuideRegistryEntry[];
}

export interface HelpHubFeatureSection extends HelpHubFeatureConfig {
  anchorId: string;
  guides: PublicHelpGuideRegistryEntry[];
}

export interface HelpGuideSearchEntry {
  guide: PublicHelpGuideRegistryEntry;
  categoryLabel: string;
  featureLabel: string;
  searchableText: string;
}

export interface HelpGuideFamilyCoverage {
  feature: HelpGuideFeature;
  label: string;
  guideCount: number;
  presentGuideTypes: HelpGuideType[];
  missingGuideTypes: HelpGuideType[];
}

const helpHubCategoryConfig: readonly HelpHubCategoryConfig[] = [
  {
    category: HELP_GUIDE_CATEGORY.GETTING_STARTED,
    label: `Getting started`,
    description: `Learn how the workspace is organized and where the main task areas live.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.DASHBOARD,
    label: `Dashboard`,
    description: `Understand balances, tasks, and the main workspace overview.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.PAYMENTS,
    label: `Payments`,
    description: `Browse payment overviews, request flows, and issue recovery guidance.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.DOCUMENTS,
    label: `Documents`,
    description: `See how uploads, attachments, and document handling fit into the workspace.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    label: `Contacts and contracts`,
    description: `Find help for managing contacts, reviewing agreements, and completing contract-linked tasks.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    label: `Banking and withdrawal`,
    description: `Understand funding methods, withdrawals, and related operational states.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.EXCHANGE,
    label: `Exchange`,
    description: `Browse conversion, rules, scheduled exchanges, and exchange troubleshooting.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.SETTINGS_AND_PROFILE,
    label: `Settings and profile`,
    description: `Find profile, preferences, and account security guidance.`,
  },
  {
    category: HELP_GUIDE_CATEGORY.VERIFICATION_AND_SECURITY,
    label: `Verification and security`,
    description: `Understand verification states, additional checks, and security-sensitive steps.`,
  },
] as const;

const helpHubFeatureConfig: readonly HelpHubFeatureConfig[] = [
  {
    feature: HELP_GUIDE_FEATURE.WORKSPACE,
    label: `Workspace`,
    description: `Orientation guides that explain how the signed-in consumer workspace is structured.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    label: `Dashboard`,
    description: `Help for balances, tasks, and overview signals shown on the dashboard.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    label: `Payments`,
    description: `Guides for requests, payer-side flows, statuses, and payment troubleshooting.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    label: `Documents`,
    description: `Support for document uploads, attachments, and related workspace flows.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    label: `Contacts`,
    description: `Help for adding contacts, checking relationship details, and keeping contact information up to date.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    label: `Contracts`,
    description: `Help for reviewing agreements, checking contract status, and handling contract-linked tasks.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.BANKING,
    label: `Banking`,
    description: `Help for linked accounts, payout methods, and other banking setup steps.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    label: `Withdrawal`,
    description: `Help for moving money out, choosing a destination, and tracking withdrawal status.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    label: `Exchange`,
    description: `Guides for immediate conversion, exchange automation, and exchange troubleshooting.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    label: `Settings`,
    description: `Guides for profile updates, preferences, and security-sensitive account changes.`,
  },
  {
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    label: `Verification`,
    description: `Guides for signed-in verification states, checks, and recovery paths.`,
  },
] as const;

const guideTypePriority: Record<HelpGuideType, number> = {
  [HELP_GUIDE_TYPE.OVERVIEW]: 0,
  [HELP_GUIDE_TYPE.TASK]: 1,
  [HELP_GUIDE_TYPE.TROUBLESHOOTING]: 2,
};

const helpGuideTypesInCoverageOrder = [
  HELP_GUIDE_TYPE.OVERVIEW,
  HELP_GUIDE_TYPE.TASK,
  HELP_GUIDE_TYPE.TROUBLESHOOTING,
] as const satisfies readonly HelpGuideType[];

export const helpGuideTypeLabels: Record<HelpGuideType, string> = {
  [HELP_GUIDE_TYPE.OVERVIEW]: `Overview`,
  [HELP_GUIDE_TYPE.TASK]: `Task guide`,
  [HELP_GUIDE_TYPE.TROUBLESHOOTING]: `Troubleshooting`,
};

export const helpGuideCategoryLabels: Record<HelpGuideCategory, string> = helpHubCategoryConfig.reduce(
  (accumulator, config) => {
    accumulator[config.category] = config.label;
    return accumulator;
  },
  {} as Record<HelpGuideCategory, string>,
);

export const helpGuideFeatureLabels: Record<HelpGuideFeature, string> = helpHubFeatureConfig.reduce(
  (accumulator, config) => {
    accumulator[config.feature] = config.label;
    return accumulator;
  },
  {} as Record<HelpGuideFeature, string>,
);

function sortGuides(left: PublicHelpGuideRegistryEntry, right: PublicHelpGuideRegistryEntry) {
  const leftTypePriority = guideTypePriority[left.guideType];
  const rightTypePriority = guideTypePriority[right.guideType];

  if (leftTypePriority !== rightTypePriority) {
    return leftTypePriority - rightTypePriority;
  }

  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title);
}

function getCategoryAnchorId(category: HelpGuideCategory) {
  return `category-${category}`;
}

function getFeatureAnchorId(feature: HelpGuideFeature) {
  return `feature-${feature}`;
}

function getPreferredCategoryGuide(guides: readonly PublicHelpGuideRegistryEntry[]) {
  const overviewGuide = guides.find((guide) => guide.guideType === HELP_GUIDE_TYPE.OVERVIEW);
  return overviewGuide ?? guides[0];
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, ` `)
    .replace(/\s+/g, ` `)
    .trim();
}

function getSearchScore(entry: HelpGuideSearchEntry, tokens: readonly string[]) {
  const titleText = normalizeSearchText(entry.guide.title);
  const summaryText = normalizeSearchText(entry.guide.summary);
  const categoryText = normalizeSearchText(entry.categoryLabel);
  const featureText = normalizeSearchText(entry.featureLabel);
  const routeText = normalizeSearchText(entry.guide.routeAffinity.join(` `));

  return tokens.reduce((score, token) => {
    let nextScore = score;

    if (titleText.includes(token)) {
      nextScore += 6;
    }

    if (summaryText.includes(token)) {
      nextScore += 3;
    }

    if (categoryText.includes(token)) {
      nextScore += 2;
    }

    if (featureText.includes(token)) {
      nextScore += 2;
    }

    if (routeText.includes(token)) {
      nextScore += 1;
    }

    return nextScore;
  }, 0);
}

const categorySections = helpHubCategoryConfig.map((config) => {
  const guides = publicHelpGuideRegistry
    .filter((guide) => guide.category === config.category)
    .slice()
    .sort(sortGuides);

  return {
    ...config,
    anchorId: getCategoryAnchorId(config.category),
    guides,
  } satisfies HelpHubCategorySection;
});

const featureSections = helpHubFeatureConfig.map((config) => {
  const guides = publicHelpGuideRegistry
    .filter((guide) => guide.feature === config.feature)
    .slice()
    .sort(sortGuides);

  return {
    ...config,
    anchorId: getFeatureAnchorId(config.feature),
    guides,
  } satisfies HelpHubFeatureSection;
});

const startHereCategoryPriority: readonly HelpGuideCategory[] = [
  HELP_GUIDE_CATEGORY.GETTING_STARTED,
  HELP_GUIDE_CATEGORY.PAYMENTS,
  HELP_GUIDE_CATEGORY.VERIFICATION_AND_SECURITY,
  HELP_GUIDE_CATEGORY.SETTINGS_AND_PROFILE,
];

const startHereGuides = startHereCategoryPriority
  .map((category) => categorySections.find((section) => section.category === category))
  .filter((section): section is HelpHubCategorySection => Boolean(section))
  .map((section) => getPreferredCategoryGuide(section.guides))
  .filter((guide): guide is PublicHelpGuideRegistryEntry => Boolean(guide))
  .slice(0, 3);

const featuredGuides = [...publicHelpGuideRegistry]
  .sort((left, right) => {
    const leftCategoryIndex = helpHubCategoryConfig.findIndex((config) => config.category === left.category);
    const rightCategoryIndex = helpHubCategoryConfig.findIndex((config) => config.category === right.category);

    if (leftCategoryIndex !== rightCategoryIndex) {
      return leftCategoryIndex - rightCategoryIndex;
    }

    return sortGuides(left, right);
  })
  .slice(0, 4);

const helpGuideSearchEntries = publicHelpGuideRegistry.map((guide) => {
  const categoryLabel = helpGuideCategoryLabels[guide.category];
  const featureLabel = helpGuideFeatureLabels[guide.feature];

  return {
    guide,
    categoryLabel,
    featureLabel,
    searchableText: normalizeSearchText(
      [guide.title, guide.summary, categoryLabel, featureLabel, guide.routeAffinity.join(` `)].join(` `),
    ),
  } satisfies HelpGuideSearchEntry;
});

const featureCoverage = featureSections.map((section) => {
  const presentGuideTypes = helpGuideTypesInCoverageOrder.filter((guideType) =>
    section.guides.some((guide) => guide.guideType === guideType),
  );
  const missingGuideTypes = helpGuideTypesInCoverageOrder.filter((guideType) => !presentGuideTypes.includes(guideType));

  return {
    feature: section.feature,
    label: section.label,
    guideCount: section.guides.length,
    presentGuideTypes: [...presentGuideTypes],
    missingGuideTypes: [...missingGuideTypes],
  } satisfies HelpGuideFamilyCoverage;
});

export function searchHelpGuides(query: string, feature?: HelpGuideFeature | null): HelpGuideSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery ? normalizedQuery.split(` `).filter(Boolean) : [];

  return helpGuideSearchEntries
    .filter((entry) => {
      if (feature && entry.guide.feature !== feature) {
        return false;
      }

      if (tokens.length === 0) {
        return true;
      }

      return tokens.every((token) => entry.searchableText.includes(token));
    })
    .slice()
    .sort((left, right) => {
      if (tokens.length > 0) {
        const leftScore = getSearchScore(left, tokens);
        const rightScore = getSearchScore(right, tokens);

        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }
      }

      return sortGuides(left.guide, right.guide);
    });
}

export const helpHubData = {
  categories: categorySections,
  coveredCategories: categorySections.filter((section) => section.guides.length > 0),
  featureSections,
  coveredFeatureSections: featureSections.filter((section) => section.guides.length > 0),
  startHereGuides,
  featuredGuides,
  searchableGuides: helpGuideSearchEntries,
  featureLabels: featureSections.filter((section) => section.guides.length > 0).map((section) => section.label),
  totalGuideCount: publicHelpGuideRegistry.length,
  totalCategoryCount: helpHubCategoryConfig.length,
  coveredCategoryCount: categorySections.filter((section) => section.guides.length > 0).length,
  totalFeatureCount: helpHubFeatureConfig.length,
  coveredFeatureCount: featureSections.filter((section) => section.guides.length > 0).length,
  routeAffinityCount: new Set(publicHelpGuideRegistry.flatMap((guide) => guide.routeAffinity)).size,
  coverageGaps: {
    missingCategories: categorySections.filter((section) => section.guides.length === 0),
    missingFeatures: featureSections.filter((section) => section.guides.length === 0),
    incompleteFeatureFamilies: featureCoverage.filter(
      (coverage) => coverage.guideCount > 0 && coverage.missingGuideTypes.length > 0,
    ),
  },
};

export function getHelpGuideFamilyCoverage(feature: HelpGuideFeature): HelpGuideFamilyCoverage | null {
  return featureCoverage.find((coverage) => coverage.feature === feature) ?? null;
}

export function getHelpGuideSearchTokens(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery ? normalizedQuery.split(` `).filter(Boolean) : [];
}
