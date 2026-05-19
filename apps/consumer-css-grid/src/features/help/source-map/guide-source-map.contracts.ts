import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const contractsGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    routes: [`/contracts`, `/contracts/[contractId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contracts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/[contractId]/page.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contracts/consumer-contracts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [
      `Contracts coverage is grounded in the current list filters, detail pages, and workflow links exposed by the contracts workspace.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    routes: [`/contracts`, `/contracts/[contractId]`, `/contacts`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contracts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractInlineActionsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/[contractId]/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contacts/page.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contracts/consumer-contracts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [
      `Contracts task guidance stays tied to the relationship list, detail view, and inline-action surfaces already implemented.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.CONTRACTS,
    routes: [`/contracts`, `/contracts/[contractId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/contracts/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/ContractDetailView.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/contracts/[contractId]/page.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/contracts/consumer-contracts.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/02-contacts-and-contracts-guides.md`,
    ],
    notes: [
      `Contracts troubleshooting remains grounded in the list, filtering, and contract-detail surfaces already visible to the consumer.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
