import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const gettingStartedHelpGuideContent = {
  [HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW]: {
    whatThisFeatureDoes: [
      `This guide gives you a practical map of the signed-in workspace so you can move between the dashboard, payments, documents, and settings without trial and error.`,
      `It focuses on the routes you are most likely to use first, how each area fits into a normal workflow, and where to return when you are not sure what should happen next.`,
    ],
    whenToUseIt: [
      `Use it right after signing in if the workspace is new to you.`,
      `Use it before starting a payment, document, or verification task if you are not sure which section owns that action.`,
      `Use it whenever you feel lost in the shell and need to re-anchor yourself before continuing.`,
    ],
    beforeYouStartDescription: `Make sure you are signed in, can see the shell navigation, and can open the dashboard without being redirected away.`,
    callouts: [
      {
        variant: `info`,
        title: `Start with the route that shows current state`,
        body: `When you are unsure what to do next, the dashboard is usually the fastest way to confirm whether the next step is about verification, a payment, a document, or an account setting.`,
      },
    ],
    steps: [
      {
        title: `Scan the shell navigation before opening anything deep`,
        body: `After signing in, look through the main navigation so you know where the workspace keeps overview pages, payment flows, document handling, and account settings.`,
        outcome: `You build a quick mental model of the shell instead of navigating one page at a time.`,
      },
      {
        title: `Use the dashboard to read what needs attention now`,
        body: `Open the dashboard and check the visible summary cards, balances, and verification banner before starting a specific task. That view is the best first checkpoint when you need to understand your current account state.`,
        outcome: `You know whether the next step is urgent account maintenance, a payment follow-up, or a new action.`,
      },
      {
        title: `Open the area that owns the task`,
        body: `Go to Payments when the task is about requests, payer-side payments, or payment detail review. Go to Documents when the task is about uploads, stored files, or attachments. Go to Settings when the task is about profile details, password, theme, preferred currency, or verification status.`,
        outcome: `You land in the section that actually controls the next step.`,
      },
      {
        title: `Use guide-level help when a route becomes specific`,
        body: `Once you know the route family, switch from general navigation to the matching help guide. A route like /payments/new-request, /payments/start, or /settings needs task-specific instructions, not just a workspace overview.`,
        outcome: `You move from orientation into a concrete workflow without guessing the next click.`,
      },
    ],
    whatHappensNext: [
      `Once you understand the shell, most questions stop being about navigation and become feature-specific.`,
      `Your next best move is usually to open the guide for the exact route or task you need to finish, such as creating a request, starting a payment, uploading a document, or updating account settings.`,
    ],
    rulesAndLimits: [
      `The navigation you see depends on your current signed-in account and state, so not every account will expose every path in the same way.`,
      `If a section is missing, treat that as an account-state signal first, not as proof that you clicked the wrong place.`,
      `A route name tells you where to go, but the route itself usually tells you what you can do right now.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I signed in but do not see the section I expected.`,
        answer: `Refresh the workspace and confirm you are signed into the expected account. If the section still does not appear, the route may not be available for your current account state yet.`,
      },
      {
        question: `I can open a section but I am not sure what action belongs there.`,
        answer: `Return to the dashboard, decide on the exact outcome you need, then open the guide for that workflow instead of relying only on the section name.`,
      },
    ],
    faq: [
      {
        question: `Should I always start from the dashboard?`,
        answer: `Usually yes when you need orientation. If you already know you need a specific flow such as /payments/new-request or /settings, you can go there directly.`,
      },
    ],
  },
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
