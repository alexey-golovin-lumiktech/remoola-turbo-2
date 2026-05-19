import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const verificationHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `How verification works`,
    summary: `Understand the purpose of verification, the states you may see, and what to do when more information is requested.`,
    category: HELP_GUIDE_CATEGORY.VERIFICATION_AND_SECURITY,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`, `/settings`],
    order: 70,
    prerequisites: [
      `Open your workspace so you can compare the guide with your current verification status in the app.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.VERIFICATION_COMPLETE_AND_RECOVER,
      HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES,
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_COMPLETE_AND_RECOVER,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to complete verification and recover from follow-up requests`,
    summary: `Use the visible verification state to continue, retry, restart, or finish profile prerequisites without taking the wrong recovery step.`,
    category: HELP_GUIDE_CATEGORY.VERIFICATION_AND_SECURITY,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`, `/settings`],
    order: 72,
    prerequisites: [
      `Open the dashboard or settings page and identify the exact verification badge or action currently shown in the app.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES,
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
      HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common verification issues and next steps`,
    summary: `Use this guide when verification is stuck in review, asks for more information, or blocks the action you expected to take next.`,
    category: HELP_GUIDE_CATEGORY.VERIFICATION_AND_SECURITY,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`, `/settings`],
    order: 75,
    prerequisites: [
      `Open the dashboard or settings verification area so you can compare the guide with the current badge, message, or action button.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.VERIFICATION_COMPLETE_AND_RECOVER,
      HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
