import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const contactsGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    routes: [`/contacts`, `/contacts/[contactId]/details`, `/payments/start`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contacts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/[contactId]/details/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/start/page.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contacts/consumer-contacts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [`Contacts guidance is grounded in saved-contact search, detail review, and payment-flow reuse.`],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    routes: [`/contacts`, `/contacts/[contactId]/details`, `/payments/start`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contacts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/[contactId]/details/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/start/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/contacts.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contacts/consumer-contacts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [
      `Contact task coverage uses the create, update, delete, search, and detail flows already implemented in the contacts workspace.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.CONTACTS,
    routes: [`/contacts`, `/contacts/[contactId]/details`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contacts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/ContactDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/[contactId]/details/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/contacts.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contacts/consumer-contacts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [
      `Contacts troubleshooting remains tied to the same search and detail surfaces as the primary contact workflows.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
