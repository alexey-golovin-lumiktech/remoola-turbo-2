import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const documentsHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Documents overview`,
    summary: `Understand how uploads, stored files, and payment attachments fit together across the documents area and related workflows.`,
    category: HELP_GUIDE_CATEGORY.DOCUMENTS,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/documents`, `/payments/[paymentRequestId]`],
    order: 45,
    prerequisites: [
      `Open the documents area or a payment detail page so you can compare the guide with the current document and attachment surfaces.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
      HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to upload and attach documents`,
    summary: `Learn how to add documents in the workspace and prepare them for related flows such as payments.`,
    category: HELP_GUIDE_CATEGORY.DOCUMENTS,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/documents`, `/payments/[paymentRequestId]`],
    order: 50,
    prerequisites: [`Make sure the file you need is available before you open the documents area or a draft payment.`],
    relatedGuides: [
      HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common document issues and next steps`,
    summary: `Use this guide when a document will not upload, attach, appear, or behave as expected in a payment workflow.`,
    category: HELP_GUIDE_CATEGORY.DOCUMENTS,
    feature: HELP_GUIDE_FEATURE.DOCUMENTS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/documents`, `/payments/[paymentRequestId]`],
    order: 55,
    prerequisites: [
      `Open the documents area or affected payment detail page so you can compare the guide with the visible document state.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
