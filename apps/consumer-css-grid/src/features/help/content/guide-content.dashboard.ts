import { createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const dashboardHelpGuideContent = {
  [HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW]: {
    whatThisFeatureDoes: [
      `This guide explains how to read the dashboard as a workspace summary instead of treating it as a separate workflow with its own hidden rules.`,
      `It helps you understand which parts of the page are showing balance context, verification state, pending work, and shortcuts into the routes where the real next action happens.`,
    ],
    whenToUseIt: [
      `Use it right after signing in when you want to understand what the dashboard is highlighting now.`,
      `Use it when balances, verification, pending requests, or quick documents look unfamiliar and you need to know which signal matters first.`,
      `Use it when the dashboard is available but you are not sure whether to stay there or continue into Payments, Documents, Settings, or another route.`,
    ],
    beforeYouStartDescription: `Open /dashboard and keep the visible cards, balance summary, verification banner, and panels in front of you while you read.`,
    callouts: [
      {
        variant: `info`,
        title: `The dashboard is an orientation surface`,
        body: `Most dashboard cards summarize current state, but the next action usually happens in another dedicated route such as Payments, Documents, Withdrawal, or Settings.`,
      },
    ],
    steps: [
      {
        title: `Scan the top summary before drilling into any single task`,
        body: `Start with the balance cards, request count, and last-payment signal so you know whether the workspace is mostly waiting, actively moving money, or simply idle right now.`,
        outcome: `You get a fast read on the current account state before opening another route.`,
      },
      {
        title: `Compare settled and available balances carefully`,
        body: `Treat settled balance as the completed-wallet view and available balance as the spendable-now view already used by exchange and withdrawal flows. When the dashboard shows multiple currencies, use the breakdown section to compare both numbers per currency instead of assuming one total explains everything.`,
        outcome: `You understand whether the dashboard is describing completed value, immediately spendable value, or both.`,
      },
      {
        title: `Read the verification banner before starting sensitive actions`,
        body: `The verification banner is one of the strongest dashboard signals because it can explain why some account capabilities are ready, in review, or still waiting on more information. Let the badge and button tell you whether to continue, retry, or wait.`,
        outcome: `You avoid starting a payment or account task without checking the current verification state first.`,
      },
      {
        title: `Use open requests, withdrawals, and activity to decide the next route`,
        body: `Open payment requests tell you where follow-up work already exists. Pending withdrawals show whether money movement is still in progress. The activity timeline is the quickest way to confirm what changed recently before you jump into a detail page.`,
        outcome: `You move into the right workflow based on live signals instead of guesswork.`,
      },
      {
        title: `Treat task and quick-doc panels as action hints, not final destinations`,
        body: `Tasks help you see onboarding or compliance progress, while quick documents help you notice recent files. If either panel reveals something missing, continue into the route that owns the task instead of expecting the dashboard itself to complete it.`,
        outcome: `You use the dashboard as a launcher and checkpoint rather than trying to do every step there.`,
      },
    ],
    whatHappensNext: [
      `After reading the dashboard, the usual next step is to continue into a route that owns the task, such as Payments for active requests, Settings for verification follow-up, or Documents for file work.`,
      `If the dashboard is temporarily unavailable, the safest fallback is to continue with the route you already know you need rather than waiting for the summary page to recover.`,
    ],
    rulesAndLimits: [
      `Dashboard cards summarize state, but they do not replace the detailed workflow pages where actions actually happen.`,
      `Settled and available balances are intentionally different concepts, so a mismatch between them does not automatically mean data is wrong.`,
      `An empty dashboard panel can simply mean there is nothing active right now, not that a workflow is broken.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `The dashboard says data is temporarily unavailable. Should I stop working?`,
        answer: `No. The page itself tells you that navigation and payment flows are still available. Continue into the feature route you need, such as Payments, while the summary data catches up later.`,
      },
      {
        question: `The available balance is different from the settled balance.`,
        answer: `That can be normal. Settled balance reflects completed wallet entries, while available balance reflects what spendable-now flows already treat as usable.`,
      },
      {
        question: `The dashboard looks empty, so I am not sure what to do next.`,
        answer: `Use the dashboard as confirmation that no urgent item is waiting there, then open the guide or route for the task you actually want to complete next.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.DASHBOARD_TASKS_AND_NEXT_STEPS]: createTaskArticle({
    taskLabel: `use dashboard tasks and next steps`,
    entrySurface: `/dashboard`,
    requirements: `the current dashboard cards, task list, verification state, and quick documents panel in front of you`,
    actionSummary: `Use the visible cards, tasks, quick documents, and linked actions to decide which dedicated route should own the next step instead of trying to finish everything on the dashboard itself.`,
    completionState: `You leave the dashboard with a clear route-level next action instead of a vague idea of what might matter.`,
    fallbackGuide: `the dashboard troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.DASHBOARD_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `the dashboard`,
    issueSurface: `dashboard data looks empty, stale, or temporarily unavailable`,
    firstCheck: `Compare the visible banner, cards, and verification signal to see whether the page is truly unavailable or simply showing that there is nothing urgent right now.`,
    recoveryAction: `If the route says dashboard data is unavailable, continue into the dedicated feature route you already need, such as Payments, Documents, Withdrawal, or Settings, instead of waiting on the summary page.`,
    waitState: `Wait when the dashboard is only summarizing state and the route already tells you the next action is happening somewhere else or that a review is still in progress.`,
    escalationPath: `Return to the dashboard overview to re-orient yourself, then move into the dedicated task or recovery guide for the feature that is actually blocking you.`,
  }),
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
