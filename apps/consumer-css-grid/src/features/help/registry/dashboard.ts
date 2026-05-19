import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const dashboardHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Dashboard overview`,
    summary: `Understand what the dashboard is summarizing, how balances and tasks relate to the rest of the workspace, and where to go next.`,
    category: HELP_GUIDE_CATEGORY.DASHBOARD,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`],
    order: 15,
    prerequisites: [
      `Sign in and open the dashboard so you can compare the guide with the current cards, panels, and verification state.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to use dashboard tasks and next steps`,
    summary: `Use the dashboard cards, tasks, quick documents, and payment signals to choose the right next route without guessing.`,
    category: HELP_GUIDE_CATEGORY.DASHBOARD,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`],
    order: 16,
    prerequisites: [
      `Open the dashboard so the balance cards, task list, quick documents, and verification state are visible.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common dashboard issues and what to do next`,
    summary: `Use this guide when dashboard data looks empty, stale, or temporarily unavailable and you need to know the safest next move.`,
    category: HELP_GUIDE_CATEGORY.DASHBOARD,
    feature: HELP_GUIDE_FEATURE.DASHBOARD,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/dashboard`],
    order: 18,
    prerequisites: [
      `Open the dashboard and compare the guide with the message, panel, or banner that currently looks incorrect or blocked.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
