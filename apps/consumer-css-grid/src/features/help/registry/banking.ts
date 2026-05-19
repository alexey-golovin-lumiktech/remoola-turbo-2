import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const bankingHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.BANKING_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Banking overview`,
    summary: `Understand how bank accounts, cards, default methods, and payout destinations are organized in the banking area.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.BANKING,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/banking`, `/withdraw`, `/payments/start`],
    order: 120,
    prerequisites: [
      `Open the banking page so you can compare the guide with the saved bank-account and card sections currently available.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to add and manage bank accounts and cards`,
    summary: `Add payout destinations and saved cards, choose the right default method, and keep reusable payment methods ready for later flows.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.BANKING,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/banking`, `/withdraw`, `/payments/start`],
    order: 125,
    prerequisites: [
      `Have the bank or card details you want to save ready before opening the matching form in Banking.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common banking issues and next steps`,
    summary: `Use this guide when a bank account or saved card cannot be added, updated, deleted, or selected the way you expect.`,
    category: HELP_GUIDE_CATEGORY.BANKING_AND_WITHDRAWAL,
    feature: HELP_GUIDE_FEATURE.BANKING,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/banking`, `/withdraw`, `/payments/start`],
    order: 130,
    prerequisites: [
      `Open the banking page so you can compare the guide with the current method list, validation message, or disabled action.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
