import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const verificationGuideSourceMap = [
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
      `apps/consumer-css-grid/src/lib/actions/payments.server.ts`,
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
      `apps/consumer-css-grid/src/lib/actions/payments.server.ts`,
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
      `apps/consumer-css-grid/src/lib/actions/payments.server.ts`,
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
