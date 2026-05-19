import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import { HELP_GUIDE_FEATURE, type HelpGuideSourceMapEntry } from '../guide-types';

export const exchangeGuideSourceMap = [
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
      `apps/consumer-css-grid/src/lib/mutations/exchange.server.ts`,
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
      `apps/consumer-css-grid/src/lib/mutations/exchange.server.ts`,
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
      `apps/consumer-css-grid/src/lib/mutations/exchange.server.ts`,
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
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];
