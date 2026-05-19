import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const settingsGuideSourceMap = [
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
      `apps/consumer-css-grid/src/lib/mutations/settings.server.ts`,
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
      `apps/consumer-css-grid/src/lib/mutations/settings.server.ts`,
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
      `apps/consumer-css-grid/src/lib/mutations/settings.server.ts`,
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
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
