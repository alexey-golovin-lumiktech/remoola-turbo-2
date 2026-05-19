import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const exchangeHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Exchange overview`,
    summary: `Understand how the main Exchange route combines manual conversion, live rates, automation shortcuts, and dedicated rules and scheduling surfaces.`,
    category: HELP_GUIDE_CATEGORY.EXCHANGE,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    order: 160,
    prerequisites: [
      `Open the Exchange area so you can compare the guide with the convert form, live-rate cards, auto-rules section, and scheduled conversions panel.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to quote, convert, and manage exchange automation`,
    summary: `Use the main Exchange route to get a quote and convert now, then manage auto-rules or scheduled conversions from the dedicated exchange surfaces.`,
    category: HELP_GUIDE_CATEGORY.EXCHANGE,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    order: 165,
    prerequisites: [
      `Make sure you have a source balance, two different currencies, and a clear idea whether the action should happen now, through an auto-rule, or on a future schedule.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common exchange issues and next steps`,
    summary: `Use this guide when quotes, balances, rule inputs, or scheduled-conversion states do not behave the way the current exchange surfaces suggest they should.`,
    category: HELP_GUIDE_CATEGORY.EXCHANGE,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    order: 170,
    prerequisites: [
      `Open the exact exchange page that is showing the problem so you can compare the guide with the current validation message, disabled action, status badge, or unavailable rates state.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
