import { createOverviewArticle, createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const contractsHelpGuideContent = {
  [HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW]: createOverviewArticle({
    featureLabel: `the contracts workspace`,
    routeSummary: `/contracts or /contracts/[contractId]`,
    primaryTask: `reviewing a relationship, filtering the list, or continuing into the correct next workflow`,
    troubleshootingFocus: `unexpected filters, empty results, and unclear contract follow-up`,
    nextStep: `to use the contracts task guide for the next action or the contracts troubleshooting guide if the relationship state looks wrong`,
  }),
  [HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS]: createTaskArticle({
    taskLabel: `review contracts and continue the next step`,
    entrySurface: `/contracts or a contract detail page`,
    requirements: `the correct search filters, relationship context, and any supporting contact or payment information you need`,
    actionSummary: `Use the list filters, relationship summary, detail view, and inline actions to move from contract context into the correct payment, contact, or document follow-up.`,
    completionState: `You end on the contract, detail page, or downstream workflow that actually owns the next step.`,
    fallbackGuide: `the contracts troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `contracts`,
    issueSurface: `contract search, detail state, or next-step actions do not match what you expected`,
    firstCheck: `Confirm the current filters, the contract you opened, and whether the route is showing a relationship summary versus a direct action workflow.`,
    recoveryAction: `Reset filters, reopen the intended contract detail page, and use the visible relationship state before following any next-step link.`,
    waitState: `Wait only when the contract route already reflects the latest activity but a downstream workflow is still catching up rather than showing a direct error.`,
    escalationPath: `Return to the contracts overview or contracts task guide so you can re-enter the relationship workflow from the correct list or detail surface.`,
  }),
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
