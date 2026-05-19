import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const bankingGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.BANKING_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.BANKING,
    routes: [`/banking`, `/withdraw`, `/payments/start`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/banking/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/BankingClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/ReusableCardSetupPanel.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/withdraw/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/start/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/banking.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Banking overview covers both payout setup and reusable payment-method behavior already exposed in the workspace.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
    feature: HELP_GUIDE_FEATURE.BANKING,
    routes: [`/banking`, `/withdraw`, `/payments/start`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/banking/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/BankingClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/ReusableCardSetupPanel.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/withdraw/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/start/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/banking.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Banking task coverage uses the add, delete, and set-default mutations already wired into the Banking client.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.BANKING,
    routes: [`/banking`, `/withdraw`, `/payments/start`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/banking/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/BankingClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/ReusableCardSetupPanel.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/banking.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Banking troubleshooting stays aligned with the current payment-method validation and default-selection behavior.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
