import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const withdrawalHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Withdrawal overview`,
    summary: `Understand how withdrawals and consumer-to-consumer transfers use available balance, saved bank methods, and recent movement history.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/withdraw`, `/banking`, `/dashboard`],
    order: 140,
    prerequisites: [
      `Open the move-funds page so you can compare the guide with the available-balance view, destination selector, and withdrawal history.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to withdraw funds or send a transfer`,
    summary: `Use the move-funds flow to withdraw available balance to a saved bank account or transfer value to another consumer account.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/withdraw`, `/banking`],
    order: 145,
    prerequisites: [
      `Make sure you have a positive available balance and, for withdrawals, at least one saved bank account.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
      HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common withdrawal issues and next steps`,
    summary: `Use this guide when withdrawals or transfers are unavailable, pending, over balance, or blocked by missing payout setup.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/withdraw`, `/banking`, `/dashboard`],
    order: 150,
    prerequisites: [
      `Open the move-funds page and compare the guide with the current balance, destination, field error, or pending history row.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
      HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
