import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const paymentsGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    routes: [`/payments`, `/payments/new-request`, `/payments/start`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/payments/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentDetailActionsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentAttachmentsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`,
      `apps/api-v2/src/consumer/modules/payments/consumer-payment-requests.controller.ts`,
    ],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    routes: [`/payments`, `/payments/new-request`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/payments/new-request/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/CreatePaymentRequestForm.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payments/consumer-payment-requests.controller.ts`],
    sharedContracts: [`packages/api-types/src/currency.ts`],
    planningDocs: [`consumer-help-pack/03-content-model-and-writing-contract.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    routes: [`/payments`, `/payments/start`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/payments/start/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/start/StartPaymentClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`, `packages/api-types/src/currency.ts`],
    planningDocs: [],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.PAYMENTS_STATUSES,
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    routes: [`/payments`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/payments/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentDetailActionsClient.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.PAYMENTS,
    routes: [`/payments`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentDetailActionsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentAttachmentsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
