import { createOverviewArticle, createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const withdrawalHelpGuideContent = {
  [HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW]: createOverviewArticle({
    featureLabel: `withdrawals and transfers`,
    routeSummary: `/withdraw, with supporting context from /banking and /dashboard`,
    primaryTask: `moving funds to a bank account or transferring value to another consumer`,
    troubleshootingFocus: `missing payout setup, insufficient balance, and pending movement confusion`,
    nextStep: `to open the move-funds guide or the withdrawal troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS]: createTaskArticle({
    taskLabel: `withdraw funds or send a transfer`,
    entrySurface: `/withdraw`,
    requirements: `a positive available balance and, for withdrawals, a saved bank account`,
    actionSummary: `Pick the correct tab, confirm the balance and currency, choose the right destination or recipient, and submit only after the route shows the amount is valid.`,
    completionState: `The move-funds route now reflects a created withdrawal or transfer request instead of a draft-only attempt.`,
    fallbackGuide: `the withdrawal troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `withdrawals`,
    issueSurface: `a withdrawal or transfer is unavailable, over balance, waiting on payout setup, or still pending`,
    firstCheck: `Confirm that you have a positive available balance, the intended currency selected, and a saved bank destination if the action is a withdrawal rather than a transfer.`,
    recoveryAction: `If payout setup is missing, fix that in Banking first. If the amount is over balance, adjust the request before you retry. If the request already exists, read the current history row before submitting again.`,
    waitState: `Wait when the withdrawal has already been created and the route is now showing a pending history state instead of a new submission error.`,
    escalationPath: `Return to the withdrawal overview or banking guide so you can re-enter the flow with the correct balance, destination, and action type.`,
  }),
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
