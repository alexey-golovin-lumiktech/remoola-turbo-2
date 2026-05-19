import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const gettingStartedHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `How the consumer workspace is organized`,
    summary: `Get oriented in the main workspace, understand where core tasks live, and know where to go first.`,
    category: HELP_GUIDE_CATEGORY.GETTING_STARTED,
    feature: HELP_GUIDE_FEATURE.WORKSPACE,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`, `/payments`, `/documents`, `/settings`],
    order: 10,
    prerequisites: [`Sign in to your workspace so the shell navigation and main sections are available.`],
    relatedGuides: [
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
