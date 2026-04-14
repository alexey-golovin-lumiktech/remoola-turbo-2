import { HELP_GUIDE_SLUG, type HelpGuideSlug } from './guide-slugs';
import {
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_SOURCE_REF_KIND,
  type HelpGuideSourceMapEntry,
  type HelpGuideSourceRef,
} from './guide-types';

function toImplementationSourceRefs(entry: HelpGuideSourceMapEntry<HelpGuideSlug>): readonly HelpGuideSourceRef[] {
  return [
    ...entry.routes.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_ROUTE,
      ref,
    })),
    ...entry.frontendFiles.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_FILE,
      ref,
    })),
    ...entry.frontendDataHelpers.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.FRONTEND_FILE,
      ref,
      note: `Frontend data helper`,
    })),
    ...entry.backendSurfaces.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.API_SURFACE,
      ref,
      note: `Backend surface`,
    })),
    ...entry.sharedContracts.map((ref) => ({
      kind: HELP_GUIDE_SOURCE_REF_KIND.SHARED_CONTRACT,
      ref,
    })),
  ];
}

export const helpGuideSourceMap = [
  {
    slug: HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.WORKSPACE,
    routes: [`/dashboard`, `/payments`, `/documents`, `/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/payments/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/documents/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/page.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/consumer-dashboard/consumer-dashboard.controller.ts`,
      `apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`,
      `apps/api-v2/src/consumer/modules/documents/consumer-documents.controller.ts`,
      `apps/api-v2/src/consumer/modules/settings/consumer-settings.controller.ts`,
    ],
    sharedContracts: [],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [`Workspace orientation is grounded in the signed-in shell and the route owners for each feature area.`],
  },
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    routes: [`/dashboard`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/consumer-dashboard/consumer-dashboard.controller.ts`],
    sharedContracts: [],
    planningDocs: [`consumer-help-pack/05-contextual-entrypoints-and-discovery.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    routes: [`/dashboard`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/consumer-dashboard/consumer-dashboard.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Dashboard task guidance stays grounded in the current cards, task list, quick docs, and verification action flow.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    routes: [`/dashboard`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
    ],
    frontendDataHelpers: [`apps/consumer-css-grid/src/lib/consumer-api.server.ts`],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/consumer-dashboard/consumer-dashboard.controller.ts`],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/05-contextual-entrypoints-and-discovery.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Dashboard recovery paths are tied to the current unavailable-state banner and the route handoffs already shown in the page.`,
    ],
  },
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/payments/consumer-payments.controller.ts`],
    sharedContracts: [`packages/api-types/src/payments/constants.ts`],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`,
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
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-payment-methods.controller.ts`,
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
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    routes: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/exchange/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeRulesSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeScheduledSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/rules/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/scheduled/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/exchange/consumer-exchange.controller.ts`],
    sharedContracts: [`packages/api-types/src/currency.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/04-exchange-guides.md`,
    ],
    notes: [
      `Exchange overview is grounded in the main convert hub plus the dedicated rules and scheduled-management surfaces.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    routes: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/exchange/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeRulesSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeScheduledSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/rules/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/scheduled/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/exchange/consumer-exchange.controller.ts`],
    sharedContracts: [`packages/api-types/src/currency.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/04-exchange-guides.md`,
    ],
    notes: [
      `Exchange task coverage stays grounded in quote-and-convert on /exchange, rule management on /exchange/rules, and future scheduling on /exchange/scheduled.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.EXCHANGE,
    routes: [`/exchange`, `/exchange/rules`, `/exchange/scheduled`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/exchange/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeClient.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeRulesSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/ExchangeScheduledSection.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/rules/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/exchange/scheduled/page.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [`apps/api-v2/src/consumer/modules/exchange/consumer-exchange.controller.ts`],
    sharedContracts: [`packages/api-types/src/currency.ts`],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/04-exchange-guides.md`,
    ],
    notes: [
      `Exchange troubleshooting stays tied to current convert validation, rate refresh states, rule-form validation, and scheduled-conversion statuses.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    routes: [`/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/settings/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/settings/consumer-settings.controller.ts`,
      `apps/api-v2/src/consumer/modules/profile/consumer-profile.controller.ts`,
    ],
    sharedContracts: [
      `packages/api-types/src/consumer/theme.ts`,
      `packages/api-types/src/auth/auth-notice.ts`,
      `packages/api-types/src/currency.ts`,
    ],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    routes: [`/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/settings/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/settings/consumer-settings.controller.ts`,
      `apps/api-v2/src/consumer/modules/profile/consumer-profile.controller.ts`,
    ],
    sharedContracts: [
      `packages/api-types/src/consumer/theme.ts`,
      `packages/api-types/src/auth/auth-notice.ts`,
      `packages/api-types/src/currency.ts`,
    ],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Settings overview stays grounded in the same profile, preferences, password, and verification surfaces as the current settings task guide.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    routes: [`/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/settings/page.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/settings/consumer-settings.controller.ts`,
      `apps/api-v2/src/consumer/modules/profile/consumer-profile.controller.ts`,
    ],
    sharedContracts: [
      `packages/api-types/src/consumer/theme.ts`,
      `packages/api-types/src/auth/auth-notice.ts`,
      `packages/api-types/src/currency.ts`,
    ],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Settings troubleshooting remains tied to the current save flows and notice states implemented in the Settings client.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    routes: [`/dashboard`, `/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-verification.controller.ts`,
      `apps/api-v2/src/shared-common/utils/consumer-verification.ts`,
    ],
    sharedContracts: [],
    planningDocs: [`consumer-help-pack/02-help-information-architecture.md`],
    notes: [],
  },
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_COMPLETE_AND_RECOVER,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    routes: [`/dashboard`, `/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-verification.controller.ts`,
      `apps/api-v2/src/shared-common/utils/consumer-verification.ts`,
    ],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Verification task guidance is anchored to the visible dashboard/settings action states and their current backend transitions.`,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES,
    feature: HELP_GUIDE_FEATURE.VERIFICATION,
    routes: [`/dashboard`, `/settings`],
    frontendFiles: [
      `apps/consumer-css-grid/src/app/(shell)/dashboard/verification-banner.ts`,
      `apps/consumer-css-grid/src/app/(shell)/dashboard/DashboardVerificationAction.tsx`,
      `apps/consumer-css-grid/src/app/(shell)/settings/SettingsClient.tsx`,
    ],
    frontendDataHelpers: [
      `apps/consumer-css-grid/src/lib/consumer-api.server.ts`,
      `apps/consumer-css-grid/src/lib/consumer-mutations.server.ts`,
    ],
    backendSurfaces: [
      `apps/api-v2/src/consumer/modules/payment-methods/consumer-verification.controller.ts`,
      `apps/api-v2/src/shared-common/utils/consumer-verification.ts`,
    ],
    sharedContracts: [],
    planningDocs: [
      `consumer-help-pack/02-help-information-architecture.md`,
      `consumer-help-pack/tasks/06-dashboard-settings-and-verification-completion.md`,
    ],
    notes: [
      `Verification troubleshooting remains grounded in the current badge meanings and continue/retry/restart flows already exposed in the app.`,
    ],
  },
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];

export type HelpGuideSourceMapRecord = (typeof helpGuideSourceMap)[number];

export const helpGuideSourceMapBySlug: Record<HelpGuideSlug, HelpGuideSourceMapRecord> = helpGuideSourceMap.reduce(
  (accumulator, entry) => {
    accumulator[entry.slug] = entry;
    return accumulator;
  },
  {} as Record<HelpGuideSlug, HelpGuideSourceMapRecord>,
);

export function getGuideSourceRefs(slug: HelpGuideSlug): readonly HelpGuideSourceRef[] {
  return toImplementationSourceRefs(helpGuideSourceMapBySlug[slug]);
}
