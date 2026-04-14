import { describe, expect, it } from '@jest/globals';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from './get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from './guide-registry';

const newlyClosedContextualRoutes = [
  {
    label: `contacts`,
    route: HELP_CONTEXT_ROUTE.CONTACTS,
    expectedSlugs: [
      HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
      HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
    ],
  },
  {
    label: `contracts`,
    route: HELP_CONTEXT_ROUTE.CONTRACTS,
    expectedSlugs: [
      HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES,
    ],
  },
  {
    label: `banking`,
    route: HELP_CONTEXT_ROUTE.BANKING,
    expectedSlugs: [
      HELP_GUIDE_SLUG.BANKING_OVERVIEW,
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
      HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES,
    ],
  },
  {
    label: `withdraw`,
    route: HELP_CONTEXT_ROUTE.WITHDRAW,
    expectedSlugs: [
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
    ],
  },
  {
    label: `exchange overview`,
    route: HELP_CONTEXT_ROUTE.EXCHANGE,
    expectedSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
  },
  {
    label: `exchange rules`,
    route: HELP_CONTEXT_ROUTE.EXCHANGE_RULES,
    expectedSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
  },
  {
    label: `exchange scheduled`,
    route: HELP_CONTEXT_ROUTE.EXCHANGE_SCHEDULED,
    expectedSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
  },
] as const;

describe(`getContextualHelpGuides`, () => {
  it(`returns route-matched guides in predictable overview-first order`, () => {
    expect(
      getContextualHelpGuides({
        route: HELP_CONTEXT_ROUTE.PAYMENTS,
        limit: 4,
      }).map((guide) => guide.slug),
    ).toEqual([
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_STATUSES,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ]);
  });

  it(`allows preferred guides to be pinned ahead of plain route matches`, () => {
    expect(
      getContextualHelpGuides({
        route: HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST,
        preferredSlugs: [
          HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
          HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
          HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
        ],
        limit: 3,
      }).map((guide) => guide.slug),
    ).toEqual([
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
    ]);
  });

  it(`supports dashboard coverage without losing cross-feature route matches`, () => {
    expect(
      getContextualHelpGuides({
        route: HELP_CONTEXT_ROUTE.DASHBOARD,
        limit: 3,
      }).map((guide) => guide.slug),
    ).toEqual([
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
    ]);
  });

  it(`prioritizes documents help ahead of workspace-wide guides on the documents route`, () => {
    expect(
      getContextualHelpGuides({
        route: HELP_CONTEXT_ROUTE.DOCUMENTS,
        limit: 2,
      }).map((guide) => guide.slug),
    ).toEqual([HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW, HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH]);
  });

  it(`keeps settings-specific guidance ahead of broader workspace help`, () => {
    expect(
      getContextualHelpGuides({
        route: HELP_CONTEXT_ROUTE.SETTINGS,
        limit: 3,
      }).map((guide) => guide.slug),
    ).toEqual([
      HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
      HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
    ]);
  });

  it(`returns public-safe guide metadata without internal source refs`, () => {
    const [guide] = getContextualHelpGuides({
      route: HELP_CONTEXT_ROUTE.PAYMENTS,
      limit: 1,
    });

    expect(guide).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(guide, `sourceRefs`)).toBe(false);
  });

  it.each(newlyClosedContextualRoutes)(
    `keeps $label contextual help aligned to overview-task-troubleshooting ordering`,
    ({ route, expectedSlugs }) => {
      expect(
        getContextualHelpGuides({
          route,
          limit: 3,
        }).map((guide) => guide.slug),
      ).toEqual(expectedSlugs);
    },
  );
});
