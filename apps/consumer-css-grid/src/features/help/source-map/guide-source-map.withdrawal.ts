import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const withdrawalGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    routes: [`/withdraw`, `/banking`, `/dashboard`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/withdraw/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/withdraw/WithdrawFlowClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/manual/consumer-payment-methods.controller.ts`,
      `apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`,
    ],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Withdrawal overview connects the move-funds surface with the dashboard available-balance signal and payment history.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    routes: [`/withdraw`, `/banking`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/withdraw/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/withdraw/WithdrawFlowClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/banking/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/manual/consumer-payment-methods.controller.ts`,
      `apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`,
    ],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Move-funds task coverage is grounded in the withdraw and transfer tabs, field validation, and current pending-history list.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.WITHDRAWAL,
    routes: [`/withdraw`, `/banking`, `/dashboard`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/withdraw/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/withdraw/WithdrawFlowClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/manual/consumer-payment-methods.controller.ts`,
      `apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`,
    ],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/03-banking-and-withdrawal-guides.md`,
    ],
    notes: [
      `Withdrawal troubleshooting remains tied to balance availability, payout-method readiness, and visible status history.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
