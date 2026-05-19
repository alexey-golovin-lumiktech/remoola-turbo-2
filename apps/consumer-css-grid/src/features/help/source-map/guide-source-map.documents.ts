import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const documentsGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    routes: [`/documents`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/documents/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/documents/DocumentsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentAttachmentsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/documents.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/documents/consumer-documents.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/05-documents-family-completion.md`,
    ],
    notes: [`Document overview coverage spans the standalone documents route and the payment-attachment workflow.`],
  },
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    routes: [`/documents`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/documents/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/documents/DocumentsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentAttachmentsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/documents.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/documents/consumer-documents.controller.ts`],
    sharedContracts: [],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [`Document attachment behavior spans the shared library and draft-payment attachment clients.`],
  },
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    routes: [`/documents`, `/payments/[paymentRequestId]`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/documents/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/documents/DocumentsClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/PaymentAttachmentsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/mutations/documents.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/documents/consumer-documents.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/05-documents-family-completion.md`,
    ],
    notes: [
      `Document troubleshooting must stay aligned with the same upload and attachment surfaces as the main documents task guide.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
