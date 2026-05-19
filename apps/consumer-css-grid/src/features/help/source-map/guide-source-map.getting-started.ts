import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const gettingStartedGuideSourceMap = [
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
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
