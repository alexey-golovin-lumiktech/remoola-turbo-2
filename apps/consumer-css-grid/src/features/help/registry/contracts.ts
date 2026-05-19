import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const contractsHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Contracts overview`,
    summary: `Understand how contract relationships, recent activity, attached files, and payment history are organized in the contracts workspace.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contracts`, `/contracts/[contractId]`],
    order: 100,
    prerequisites: [
      `Open the contracts workspace so you can compare the guide with the current filters, contract rows, and detail navigation.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to review contracts and continue the next step`,
    summary: `Use contract filters, detail pages, and workflow links to move from a contract relationship into the right payment, contact, or document action.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contracts`, `/contracts/[contractId]`, `/contacts`],
    order: 105,
    prerequisites: [
      `Open the contracts workspace and decide whether you are searching, filtering, or continuing into a specific contract detail page.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common contract issues and next steps`,
    summary: `Use this guide when contract search results, filters, activity history, or detail follow-up do not match what you expected.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contracts`, `/contracts/[contractId]`],
    order: 110,
    prerequisites: [
      `Open the contracts list or a contract detail page so you can compare the current problem with the visible contract state.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
