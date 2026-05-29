import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const dashboardGuideSourceMap = [
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
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
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
      `apps/consumer-css-grid/src/lib/mutations/payments.server.ts`,
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
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
