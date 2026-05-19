import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const contactsHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Contacts overview`,
    summary: `Understand how saved contacts support payer, payout, and relationship workflows across the workspace.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contacts`, `/contacts/[contactId]/details`, `/payments/start`],
    order: 80,
    prerequisites: [
      `Open the contacts area or a contact-driven payment flow so you can compare the guide with the saved-contact experience in the app.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
      HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to add, search, and use contacts`,
    summary: `Create and update saved contacts, search them quickly, and use the right record in related payment and relationship flows.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contacts`, `/contacts/[contactId]/details`, `/payments/start`],
    order: 85,
    prerequisites: [
      `Have the contact email and any name or address details ready before you open the create or edit flow.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common contact issues and next steps`,
    summary: `Use this guide when a contact cannot be found, updated, reused, or linked cleanly into the next workspace step.`,
    category: HELP_GUIDE_CATEGORY.CONTACTS_AND_CONTRACTS,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/contacts`, `/contacts/[contactId]/details`],
    order: 90,
    prerequisites: [
      `Open the contacts list or the affected contact detail page so you can compare the current error or missing state with the guide.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
      HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
