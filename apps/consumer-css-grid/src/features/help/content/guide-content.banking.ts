import { createOverviewArticle, createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const bankingHelpGuideContent = {
  [HELP_GUIDE_SLUG.BANKING_OVERVIEW]: createOverviewArticle({
    featureLabel: `banking and saved payment methods`,
    routeSummary: `/banking, with related effects in /withdraw and payer flows`,
    primaryTask: `adding a bank account, storing a card, or choosing the correct default method`,
    troubleshootingFocus: `validation failures, wrong defaults, and payout-method confusion`,
    nextStep: `to open the banking task guide or the withdrawal guidance if the next action is moving funds`,
  }),
  [HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS]: createTaskArticle({
    taskLabel: `add and manage bank accounts and cards`,
    entrySurface: `/banking`,
    requirements: `the bank or card details you want to save and a clear idea which method should be the default`,
    actionSummary: `Choose the right method type, complete the visible form carefully, and update or set defaults only after reviewing the current saved-method list.`,
    completionState: `The payment method is saved in the right section and can support downstream payout or payer flows.`,
    fallbackGuide: `the banking troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.BANKING_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `banking`,
    issueSurface: `a bank account or saved card cannot be added, selected, or managed the way you expected`,
    firstCheck: `Verify the method type, last-four details, billing fields, and whether the route is asking for a default or just a saved record.`,
    recoveryAction: `Correct validation issues first, then retry from the matching Banking form instead of switching between bank and card flows mid-stream.`,
    waitState: `Wait only when the Banking page has already accepted the change and is refreshing the saved-method list rather than showing an immediate error or disabled action.`,
    escalationPath: `Return to the banking overview or task guide so you can restart the flow from the correct form and method type.`,
  }),
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
