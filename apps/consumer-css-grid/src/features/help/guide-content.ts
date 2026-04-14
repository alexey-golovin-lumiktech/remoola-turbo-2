import { HELP_GUIDE_SLUG, type HelpGuideSlug } from './guide-registry';

import type { HelpCalloutVariant } from './ui/HelpCallout';
import type { HelpFaqItem } from './ui/HelpFaq';
import type { HelpStepItem } from './ui/HelpSteps';

export interface HelpGuideCallout {
  variant: HelpCalloutVariant;
  title?: string;
  body: string;
}

export interface HelpGuideArticleContent {
  whatThisFeatureDoes: readonly string[];
  whenToUseIt: readonly string[];
  beforeYouStartDescription?: string;
  callouts?: readonly HelpGuideCallout[];
  steps: readonly HelpStepItem[];
  whatHappensNext: readonly string[];
  rulesAndLimits: readonly string[];
  commonIssuesAndFixes: readonly HelpFaqItem[];
  faq?: readonly HelpFaqItem[];
}

interface OverviewArticleTemplate {
  featureLabel: string;
  routeSummary: string;
  primaryTask: string;
  troubleshootingFocus: string;
  nextStep: string;
}

interface TaskArticleTemplate {
  taskLabel: string;
  entrySurface: string;
  requirements: string;
  actionSummary: string;
  completionState: string;
  fallbackGuide: string;
}

interface TroubleshootingArticleTemplate {
  featureLabel: string;
  issueSurface: string;
  firstCheck: string;
  recoveryAction: string;
  waitState: string;
  escalationPath: string;
}

function createOverviewArticle({
  featureLabel,
  routeSummary,
  primaryTask,
  troubleshootingFocus,
  nextStep,
}: OverviewArticleTemplate): HelpGuideArticleContent {
  return {
    whatThisFeatureDoes: [
      `This guide explains how ${featureLabel} is organized in the workspace so you can read the current screen before taking action.`,
      `It stays focused on the routes, states, and decisions the consumer actually sees instead of backend-only terms.`,
    ],
    whenToUseIt: [
      `Use it when you need a quick map of ${featureLabel} before starting a specific task.`,
      `Use it when the current route looks familiar, but you are not sure which panel or step matters first.`,
      `Use it before moving into a task guide or recovery guide so you start from the right surface.`,
    ],
    beforeYouStartDescription: `Open ${routeSummary} so you can compare the guide with the current workspace state while you read.`,
    steps: [
      {
        title: `Start from the route that owns the workflow`,
        body: `Use ${routeSummary} as the source of truth for what is currently available and what still needs attention.`,
        outcome: `You are looking at the correct workspace surface before you act.`,
      },
      {
        title: `Identify the primary action`,
        body: `Decide whether your goal is ${primaryTask} or whether you only need to understand the current state before moving on.`,
        outcome: `You avoid mixing overview guidance with a more specific task flow.`,
      },
      {
        title: `Read visible status, controls, and warnings together`,
        body: `Use the titles, filters, badges, buttons, and helper text already shown in the app to confirm what the workflow is allowing right now.`,
        outcome: `You pick the next step based on the live screen, not memory.`,
      },
      {
        title: `Switch to the matching detailed guide when needed`,
        body: `If the screen becomes procedural or blocked, move into the task or troubleshooting guide that covers that exact state.`,
        outcome: `You continue with focused instructions instead of broad orientation.`,
      },
    ],
    whatHappensNext: [
      `After this overview, the usual next step is ${nextStep}.`,
      `If the workflow is blocked instead of simply unclear, use the troubleshooting guide for the same feature area.`,
    ],
    rulesAndLimits: [
      `Overview guidance explains orientation first; it does not replace the route-specific action controls already shown in the app.`,
      `Visible state in the current route should override any assumption carried over from a previous visit.`,
      `If the route is missing a control you expected, treat that as a current-state signal before assuming something is broken.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can see ${featureLabel}, but I am not sure what to do first.`,
        answer: `Start by confirming whether your goal is ${primaryTask}. If yes, move to the task guide. If not, use the visible route sections to understand the current state before acting.`,
      },
      {
        question: `The route looks different from what I expected.`,
        answer: `Use the labels, badges, and helper copy on the screen as the current source of truth. Different account states can expose different next actions.`,
      },
      {
        question: `I think the workflow is blocked rather than unclear.`,
        answer: `Use the troubleshooting guide for ${featureLabel}. It is designed for ${troubleshootingFocus}.`,
      },
    ],
    faq: [
      {
        question: `Should I stay on the overview page the whole time?`,
        answer: `Usually no. Overview guidance helps you orient yourself, then the next step is to continue into the task or troubleshooting guide that matches the current screen.`,
      },
    ],
  };
}

function createTaskArticle({
  taskLabel,
  entrySurface,
  requirements,
  actionSummary,
  completionState,
  fallbackGuide,
}: TaskArticleTemplate): HelpGuideArticleContent {
  return {
    whatThisFeatureDoes: [
      `This guide walks through how to ${taskLabel} using the current workspace flow instead of a generic checklist.`,
      `It focuses on the visible fields, buttons, and state transitions that determine whether the step is ready to continue.`,
    ],
    whenToUseIt: [
      `Use it when you are ready to ${taskLabel}.`,
      `Use it when the route already exposes the form, list, or action surface and you want to avoid trial and error.`,
      `Use it when the next action matters more than broad orientation.`,
    ],
    beforeYouStartDescription: `Open ${entrySurface} and make sure you have ${requirements} ready before you begin.`,
    steps: [
      {
        title: `Open the correct workspace surface`,
        body: `Begin from ${entrySurface} so the controls you need are visible before you start editing or submitting anything.`,
        outcome: `You are using the route that actually owns the task.`,
      },
      {
        title: `Prepare the required details`,
        body: `Check that you have ${requirements} and clear any uncertainty before you submit the workflow.`,
        outcome: `You reduce avoidable validation and retry cycles.`,
      },
      {
        title: `Complete the visible action carefully`,
        body: `${actionSummary}`,
        outcome: `The task uses the same fields, controls, and route behavior currently implemented in the app.`,
      },
      {
        title: `Confirm the immediate result`,
        body: `After submission or save, read the updated state in the same route and make sure it matches the action you expected to complete.`,
        outcome: `${completionState}`,
      },
    ],
    whatHappensNext: [
      `Once the task succeeds, the next step is usually to continue with the updated state already shown in the route.`,
      `If the route exposes a new requirement, follow that state instead of repeating the same action again.`,
    ],
    rulesAndLimits: [
      `Do not submit the flow until the current route is showing the right values and action for your goal.`,
      `If a save, submit, or continue action stays disabled, use the visible field and helper text as the first debugging signal.`,
      `After a successful action, trust the updated route state more than your last input.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `The action is visible, but I am not sure whether I have the right inputs.`,
        answer: `Pause and verify that you have ${requirements}. If not, gather the missing details before you continue.`,
      },
      {
        question: `I completed the step, but the route still needs another action.`,
        answer: `That usually means the workflow has moved into a new state rather than failed. Read the updated screen and continue from there.`,
      },
      {
        question: `The task does not behave the way I expected.`,
        answer: `Use ${fallbackGuide} before retrying blindly. That guide is intended for blocked or unclear states.`,
      },
    ],
  };
}

function createTroubleshootingArticle({
  featureLabel,
  issueSurface,
  firstCheck,
  recoveryAction,
  waitState,
  escalationPath,
}: TroubleshootingArticleTemplate): HelpGuideArticleContent {
  return {
    whatThisFeatureDoes: [
      `This guide helps you recover when ${featureLabel} is blocked, unavailable, or behaving differently than you expected.`,
      `It focuses on the visible route state so you can choose the smallest correct recovery step.`,
    ],
    whenToUseIt: [
      `Use it when ${issueSurface}.`,
      `Use it when retrying the same action is not helping and you need a cleaner diagnosis path.`,
      `Use it when the app is showing a warning, disabled action, empty state, or unexpected result.`,
    ],
    beforeYouStartDescription: `Open the route where the issue appears and keep the current message, status, or disabled control visible while you troubleshoot.`,
    steps: [
      {
        title: `Start with the current visible state`,
        body: `Read the exact route, message, badge, and disabled action before changing anything else.`,
        outcome: `You troubleshoot the real current state rather than a remembered one.`,
      },
      {
        title: `Check the most likely first cause`,
        body: `${firstCheck}`,
        outcome: `You either confirm the obvious blocker or rule it out quickly.`,
      },
      {
        title: `Use the smallest recovery action first`,
        body: `${recoveryAction}`,
        outcome: `You avoid making the state harder to understand with unnecessary retries.`,
      },
      {
        title: `Decide whether to wait, continue, or switch guides`,
        body: `If the route is now in a wait state, respect it. If the route is actionable again, continue from the matching task guide.`,
        outcome: `You end the recovery flow with a clear next step instead of another guess.`,
      },
    ],
    whatHappensNext: [
      `Once the blocking state changes, return to the main task and continue from the updated route state.`,
      `If the route is explicitly in a wait state, the next correct move can simply be to stop retrying and check again later.`,
    ],
    rulesAndLimits: [
      `Do not assume an empty or disabled state means the whole feature is broken; it can reflect current eligibility or missing setup.`,
      `If the route is already telling you to wait, treat repeated submissions as low-value noise instead of a recovery strategy.`,
      `Troubleshooting should narrow the issue first, then hand you back to the main task or overview flow.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `What should I check first?`,
        answer: `${firstCheck}`,
      },
      {
        question: `When should I stop retrying and wait?`,
        answer: `${waitState}`,
      },
      {
        question: `What if the issue still is not clear after the first recovery step?`,
        answer: `${escalationPath}`,
      },
    ],
  };
}

export const helpGuideContentBySlug = {
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
  [HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW]: {
    whatThisFeatureDoes: [
      `The payments area brings together the routes for creating a request, starting a payer-side one-off payment, and reviewing an existing payment in detail.`,
      `It helps you choose the correct route first, then use the payment detail page as the source of truth for status, parties, attachments, and actions.`,
    ],
    whenToUseIt: [
      `Use it before opening /payments/new-request or /payments/start so you choose the right payment flow.`,
      `Use it when a payment already exists and you need to understand what the detail page is showing you.`,
      `Use it when you want to know how the list, detail, draft-send, and payer actions fit together.`,
    ],
    beforeYouStartDescription: `Open the payments area and decide whether you are creating a new request, starting a payment as the payer, or reviewing an existing payment.`,
    callouts: [
      {
        variant: `info`,
        title: `The detail page is the action hub`,
        body: `Once a payment exists, its detail page becomes the safest place to read status, timeline, parties, attachments, and next available actions.`,
      },
    ],
    steps: [
      {
        title: `Open the payments list`,
        body: `Start in the main payments area so you can tell whether the payment already exists or whether you are about to create something brand new.`,
        outcome: `You avoid creating a second flow when the correct payment already has its own detail page.`,
      },
      {
        title: `Choose the route that matches your role and goal`,
        body: `Use /payments/new-request when you are creating a request for someone else to pay. Use /payments/start when you are starting a payer-side one-off payment yourself. Use a payment detail page when the payment already exists and you need to act on its current state.`,
        outcome: `You enter the correct payment path instead of mixing requester and payer flows.`,
      },
      {
        title: `Read the overview, timeline, and attachments before acting`,
        body: `On a payment detail page, review the amount, status, role, due date, parties, timeline, and attachment area before you send, attach, pay, or wait.`,
        outcome: `You base the next action on the real payment state, not on memory.`,
      },
      {
        title: `Use the Actions panel only after checking the state`,
        body:
          `The Actions panel changes with payment role, status, and rail. A draft request may show ` +
          `\`Send request\`` +
          `, a payer-side card flow may show saved-card or checkout actions, and some payments may show no additional actions at all.`,
        outcome: `You understand why an action is available, missing, or replaced by a wait state.`,
      },
    ],
    whatHappensNext: [
      `After this overview, you usually continue into a specific payment guide: create request, start payment, or troubleshoot an existing payment.`,
      `If you are already on a detail page, the next step depends on what that page exposes in the Actions and Attachments panels.`,
    ],
    rulesAndLimits: [
      `Do not assume every payment route supports the same actions; the available controls depend on role, status, and sometimes payment rail.`,
      `Requester tasks and payer tasks are not the same flow, even when they end on the same detail page.`,
      `Card actions are not available on every payment, and draft-only actions such as sending or attaching files are limited to specific states.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I am not sure whether I need to create a request or start a payment.`,
        answer: `Create a request when you need another party to receive and review a payment request. Start a payment when you are initiating a payer-side one-off payment yourself from /payments/start.`,
      },
      {
        question: `I found the payment, but the next action is not obvious.`,
        answer: `Read the visible status, role, and Actions panel together. Those three signals usually explain whether you need to send a draft, pay, attach a file, generate an invoice, or wait.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST]: {
    whatThisFeatureDoes: [
      `This guide walks through the ` +
        `\`New Payment Request\`` +
        ` form that creates a requester-side payment draft for another party.`,
      `It covers the fields you actually enter, what happens immediately after submission, and why creating the draft is not the same thing as sending it to the payer.`,
    ],
    whenToUseIt: [
      `Use it when you need to create a new requester-side payment from /payments/new-request.`,
      `Use it when you want to prepare the request carefully before you send the draft onward.`,
      `Use it when you need to know which details belong in the form and which actions happen later on the detail page.`,
    ],
    beforeYouStartDescription: `Gather the recipient email, amount, currency, optional description, and any due date before you open the form.`,
    callouts: [
      {
        variant: `success`,
        title: `Create first, send second`,
        body:
          `Submitting the form creates the payment request and redirects you to its detail page. The request is only sent when you use the ` +
          `\`Send request\`` +
          ` action from the draft detail view.`,
      },
    ],
    steps: [
      {
        title: `Open the new payment request flow`,
        body: `Open /payments/new-request from the payments area. The page loads a dedicated form for requester-side payment creation and uses your settings to choose a default preferred currency when possible.`,
        outcome: `You are in the form built specifically for creating a new payment request.`,
      },
      {
        title: `Fill in the core payment fields`,
        body: `Enter the recipient email, amount, and currency. Add a description if you want the payment purpose to be clear on the detail page, and add a due date if the request needs a visible deadline. The email field also surfaces saved-contact hints while you type.`,
        outcome: `The draft contains the commercial details the payer will later review.`,
      },
      {
        title: `Submit the form to create the draft`,
        body: `Review the visible field values and submit the form. Validation will stop the request if the email is invalid, the amount is not greater than zero, the currency code is not valid, or the due date is in the past.`,
        outcome: `The app creates the payment request and redirects you into its payment detail page.`,
      },
      {
        title: `Review the draft on the payment detail page`,
        body: `Use the detail page to confirm amount, status, role, due date, parties, and description. This is also where the request remains in draft until you explicitly continue.`,
        outcome: `You can confirm that the created payment matches what you intended to send.`,
      },
      {
        title: `Add attachments while the request is still a draft if needed`,
        body: `If the request needs supporting files, use the draft payment's attachments area to upload new files directly into the draft or attach existing documents from the library before you send the request.`,
        outcome: `Your draft is complete before the other party sees it.`,
      },
      {
        title: `Send the request from the Actions panel`,
        body:
          `When the draft looks correct, use the ` +
          `\`Send request\`` +
          ` button in the Actions panel. That is the step that moves the request out of draft and into its next visible state.`,
        outcome: `The payment request is sent and ready for follow-up from the payer side.`,
      },
    ],
    whatHappensNext: [
      `Right after form submission, you are redirected to the created payment detail page rather than back to the list.`,
      `After you send the draft, that same detail page becomes the best place to monitor status, attachments, timeline changes, and payer-side progress.`,
    ],
    rulesAndLimits: [
      `The amount must be greater than zero, the recipient email must be valid, and a due date cannot be in the past.`,
      `Creating the request does not automatically send it; draft review and send are separate steps.`,
      `If attachments matter, it is usually easier to add them while the request is still a draft.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I started the form but do not have all the information yet.`,
        answer: `Pause and gather the missing details first, especially recipient email, amount, and currency. That keeps the draft cleaner and reduces later corrections.`,
      },
      {
        question: `The request was created, but the payer has not received anything yet.`,
        answer:
          `Open the payment detail page and check whether the request is still draft. If it is, use the ` +
          `\`Send request\`` +
          ` action from the Actions panel.`,
      },
      {
        question: `The due date will not save.`,
        answer: `Check that the date is valid and not earlier than today. Past dates are rejected by the form validation.`,
      },
    ],
    faq: [
      {
        question: `Can I save the request first and add attachments afterward?`,
        answer: `Yes. The app redirects you to the draft detail page after creation, and you can use the attachments section there before sending the request.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT]: {
    whatThisFeatureDoes: [
      `This guide explains the ` +
        `\`Start Payment\`` +
        ` flow for payer-side one-off payments created from /payments/start.`,
      `It is different from a payment request: you enter the recipient, amount, currency, and payment method up front, then continue in the normal payment detail flow after the payment is created.`,
    ],
    whenToUseIt: [
      `Use it when you want to initiate a payer-side one-off payment yourself.`,
      `Use it when you do not want to wait for another party to send you a request first.`,
      `Use it when you need to understand how the unknown-recipient confirmation step works before the payment is created.`,
    ],
    beforeYouStartDescription: `Have the recipient email, amount, currency, payment method, and any optional description ready before you start the form.`,
    callouts: [
      {
        variant: `warning`,
        title: `Starting a payment is not the same as creating a request`,
        body: `The start-payment flow is payer initiated. It creates the payment directly and then sends you into the payment detail experience instead of creating a requester-side draft that still needs to be sent.`,
      },
    ],
    steps: [
      {
        title: `Open the start payment route`,
        body: `Go to /payments/start. The page preloads your preferred currency from settings and opens the payer-side payment form.`,
        outcome: `You are in the one-off payment flow instead of the requester draft flow.`,
      },
      {
        title: `Enter the payment details`,
        body:
          `Fill in the recipient email, amount, currency, and payment method. You can choose between ` +
          `\`Credit Card\`` +
          ` and ` +
          `\`Bank Account\`` +
          `, and you can add an optional description if the payment needs a note.`,
        outcome: `The app has the core information needed to create the payment.`,
      },
      {
        title: `Submit the flow and handle the unknown-recipient step if it appears`,
        body: `After submission, the app checks whether the email already exists in your saved contacts. If it does not, you will see a confirmation modal where you can continue anyway, add a lightweight contact and continue, or open the full contacts page and save the draft for later.`,
        outcome: `You can decide whether to move fast, save the contact lightly, or complete a fuller contact setup first.`,
      },
      {
        title: `Continue into the payment detail page`,
        body: `Once the payment is created, the app redirects you into the normal payment detail flow. That page shows the amount, status, parties, timeline, attachments, and whichever actions are available next.`,
        outcome: `You move from creation into the route that now owns the payment lifecycle.`,
      },
      {
        title: `Use the detail page for payment follow-up`,
        body: `If the resulting payment waits on the payer, the detail page may expose saved-card or checkout actions. If it is on a bank-transfer rail or another state, the available actions can differ or disappear.`,
        outcome: `You continue based on the real state of the newly created payment.`,
      },
    ],
    whatHappensNext: [
      `After the payment is created, the detail page becomes the place to review status and continue the next action.`,
      `Depending on the selected method and current payment state, the next step may be to pay, wait, or review follow-up information from the detail page.`,
    ],
    rulesAndLimits: [
      `The form requires a valid recipient email, a positive amount, and a valid three-letter currency code.`,
      `Unknown recipients do not block the flow entirely, but the app will ask how you want to handle that email before proceeding.`,
      `Saved-card and checkout actions are part of the payment detail experience, not the start form itself.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `The email is not in my contacts yet.`,
        answer: `Use the confirmation modal to choose the fastest path: continue immediately, add a lightweight contact and continue, or jump to the full contacts page and resume from the saved draft.`,
      },
      {
        question: `I started the payment, but now I do not know what to do next.`,
        answer: `Open the payment detail page and check its status, rail, and Actions panel. That page decides whether you can pay now, need to wait, or need a different follow-up.`,
      },
      {
        question: `I expected to pay by card immediately, but card actions are not available.`,
        answer: `Check the detail page first. Card actions only appear when that payment state and rail support them. Bank-transfer pending payments, for example, do not show card checkout actions.`,
      },
    ],
    faq: [
      {
        question: `Does start payment save the recipient automatically?`,
        answer: `Not always. The contact is only saved if you choose one of the modal options that adds it, or if the email already existed in your contacts.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_STATUSES]: {
    whatThisFeatureDoes: [
      `This guide explains how to interpret the main payment statuses you see on the payments list and on a payment detail page.`,
      `It focuses on the practical question users usually have: what does this state mean for me right now, and what next step should I expect from this payment?`,
    ],
    whenToUseIt: [
      `Use it when the payments list shows a status but the next action is not obvious.`,
      `Use it when a payment detail page is open and you want to understand whether you should send, pay, wait, retry, or stop.`,
      `Use it when the same payment looks different after checkout, a draft-send action, or another workflow transition.`,
    ],
    beforeYouStartDescription: `Open the payments list or the payment detail page you are reviewing so you can compare the visible status, role, and actions with the guide.`,
    callouts: [
      {
        variant: `warning`,
        title: `Status is only half of the answer`,
        body: `Always read payment role and the visible Actions panel together with status. The same state can lead to a different next step depending on whether you are the requester or payer.`,
      },
    ],
    steps: [
      {
        title: `Start by checking whether you are reading the list or the detail page`,
        body: `The list is useful for spotting which payments need attention, but the detail page is the safer place to confirm what a status actually means for this exact payment.`,
        outcome: `You know where to verify the current state before acting.`,
      },
      {
        title: `Treat draft and pending-style states differently`,
        body: `A draft usually means the payment still needs requester-side review and a send step. Pending or waiting-style states usually mean the payment already exists in an active lifecycle and the next step may belong to the payer, an external rail, or a wait state.`,
        outcome: `You separate edit-and-send work from follow-up-and-wait work.`,
      },
      {
        title: `Use completed, denied, and uncollectible states as outcome signals`,
        body: `Completed usually means the lifecycle has reached its successful end. Denied or uncollectible states mean the payment is no longer moving forward in the normal happy path and should be reviewed as an exception instead of retried blindly.`,
        outcome: `You can tell which statuses represent closure and which represent a blocked result.`,
      },
      {
        title: `Read the Actions panel after you understand the status`,
        body: `If the status and role still allow work, the Actions panel will usually confirm it through buttons such as send request, pay with a saved card, open checkout, or generate invoice output. If no action is shown, the correct next move may be to wait or review the timeline.`,
        outcome: `You align the next click with what the current state really supports.`,
      },
      {
        title: `Use the timeline and checkout notices when a status seems delayed`,
        body: `After a card checkout flow returns, the page may need a short moment before the final payment status refreshes. Use the visible success or cancel notice together with the timeline instead of assuming the payment is stuck instantly.`,
        outcome: `You distinguish a short refresh delay from a real workflow problem.`,
      },
    ],
    whatHappensNext: [
      `Once you understand the current state, your next move is usually clear: send a draft, continue a payer-side action, wait for an external update, or treat the payment as finished.`,
      `If the state still looks inconsistent after you compare status, role, actions, and timeline, move to the common-issues guide for a more diagnostic path.`,
    ],
    rulesAndLimits: [
      `The same payment route does not expose the same actions in every status.`,
      `A missing action can be correct behavior when the payment is already finished, blocked, or waiting on another side of the flow.`,
      `Card and checkout states can update asynchronously, so a returned browser redirect is not always the final status by itself.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can see a status, but I still do not know who should act next.`,
        answer: `Open the payment detail page and read status, role, and the Actions panel together. That combination is usually the clearest answer to who owns the next step.`,
      },
      {
        question: `The payment came back from checkout, but the state still looks old.`,
        answer: `Give the detail page a moment to refresh and compare the checkout notice with the timeline before concluding that the payment failed to progress.`,
      },
      {
        question: `The list shows a state that sounds negative, so I want to try again immediately.`,
        answer: `Do not retry blindly. States like denied or uncollectible usually mean the payment needs review or a different recovery path rather than the same action repeated again.`,
      },
    ],
    faq: [
      {
        question: `Should I trust the list status or the detail page more?`,
        answer: `Use the list for fast scanning, but trust the detail page more when you need to decide the next action for a specific payment.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES]: {
    whatThisFeatureDoes: [
      `This troubleshooting guide turns the most common payment-state problems into clear next steps.`,
      `It is built around the current detail-page behavior in the app: draft send actions, payer actions, attachment restrictions, checkout responses, and wait states.`,
    ],
    whenToUseIt: [
      `Use it when a payment detail page does not show the action you expected.`,
      `Use it when you created or started a payment but the next step is unclear.`,
      `Use it when a payer action, attachment step, or invoice/download step feels blocked.`,
    ],
    beforeYouStartDescription: `Open the exact payment detail page you are troubleshooting so you can compare the visible status, role, actions, and attachments with the guide.`,
    callouts: [
      {
        variant: `warning`,
        title: `Treat status and role as the first diagnosis step`,
        body: `A missing action is often correct behavior for the current payment state. Check the visible status and role before retrying or escalating.`,
      },
    ],
    steps: [
      {
        title: `Open the payment detail page`,
        body: `Start from the payment detail page because that route shows the overview, timeline, attachments, and Actions panel together.`,
        outcome: `You have the current payment context in front of you.`,
      },
      {
        title: `Review the visible status and your role`,
        body: `Check whether you are the requester or payer, then read the payment status before looking at any button. Draft, pending, completed, or bank-transfer states can all expose different actions.`,
        outcome: `You know which side of the payment is expected to act next.`,
      },
      {
        title: `Compare the Actions panel with the Attachments panel`,
        body: `A requester draft can still show send and attachment actions, while a payer-side payment may instead show saved-card or checkout options. Some flows show no action because the correct next step is to wait.`,
        outcome: `You identify whether the blocker is about the wrong state, the wrong role, or a real failure.`,
      },
      {
        title: `Retry only the action that matches the visible state`,
        body: `If the payment is still a draft, send it. If it is waiting on the payer, use the available payer action. If the page shows a wait-only state, pause instead of repeating the same submission.`,
        outcome: `Your next action is aligned with the actual state of the payment.`,
      },
    ],
    whatHappensNext: [
      `Most payment problems resolve into one of three outcomes: send the draft, use the correct payer action, or wait for the status to progress.`,
      `If the page still looks wrong after that comparison, capture the visible status, role, and last message before asking for support.`,
    ],
    rulesAndLimits: [
      `A missing action can be correct if the payment is on the wrong role, wrong status, or wrong rail for that step.`,
      `Draft-only attachment controls are not available forever; once the payment leaves draft, the payment record behaves differently.`,
      `A slow status refresh after checkout does not automatically mean the charge failed.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I created a request, but it is still not moving.`,
        answer:
          `Check whether the payment is still a draft. If it is, use the ` +
          `\`Send request\`` +
          ` action from the detail page. Creating the request alone does not send it.`,
      },
      {
        question: `I expected to pay now, but the page does not show card controls.`,
        answer: `Check the status and rail on the payment detail page. Card actions appear only for supported payer-side states. Bank-transfer pending payments do not show card checkout actions.`,
      },
      {
        question: `I cannot attach or remove files the way I expected.`,
        answer: `Attachments behave differently once a payment leaves draft. Requester-draft payments can upload or attach from the library, but historical payment records no longer expose the same draft editing behavior.`,
      },
      {
        question: `Checkout returned, but the status still has not changed.`,
        answer: `Give the detail page a moment to refresh. The page itself warns that Stripe confirmation can take a short time before the final payment status updates.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH]: {
    whatThisFeatureDoes: [
      `This guide explains how the document library works, how uploads behave, and how files move from the library into payment drafts.`,
      `It also covers the restrictions you see later, such as when a file can no longer be deleted from the Documents page because it is already part of a payment record.`,
    ],
    whenToUseIt: [
      `Use it when you need to upload one or more files into the document library.`,
      `Use it before a draft payment asks for supporting files.`,
      `Use it when you need to understand why a document can be attached, tagged, previewed, or blocked from deletion.`,
    ],
    beforeYouStartDescription: `Check the files you plan to use so you know they are ready before you open either the document library or the draft-payment attachments area.`,
    callouts: [
      {
        variant: `info`,
        title: `Draft payments can pull from the document library`,
        body: `You can upload files in Documents ahead of time, then attach them later from a draft payment. That is often easier than hunting for files at the last minute.`,
      },
    ],
    steps: [
      {
        title: `Open the full document library or the contract-file view`,
        body: `Open /documents for the full library. If you arrive there from a contract-linked flow, the page can also open in a relationship-files mode that focuses on files tied to that contractor relationship.`,
        outcome: `You know whether you are browsing the full library or a narrower contract context.`,
      },
      {
        title: `Upload the file you need`,
        body: `Choose one or more files from your device and upload them through the document-library uploader. In a draft payment, you can also upload directly into that draft from the attachments panel.`,
        outcome: `The file is stored in a place where later flows can see it.`,
      },
      {
        title: `Review the file entry before attaching it elsewhere`,
        body: `Check the document name, kind, size, created time, and any visible tags or preview information so you know you are using the correct file.`,
        outcome: `You reduce the chance of attaching the wrong file to a payment or contract flow.`,
      },
      {
        title: `Attach the document from a draft payment when needed`,
        body: `Open the draft payment detail page and use the attachments section to choose existing files from the library or upload new ones directly into that draft.`,
        outcome: `The payment draft now includes the supporting files it needs before you send it.`,
      },
      {
        title: `Check whether the file can still be deleted from Documents`,
        body: `If a document is attached to a draft payment, remove it from that draft first before deleting it from Documents. If it is attached to a non-draft payment record, the library will block deletion because that file is now part of the historical payment record.`,
        outcome: `You understand whether the document is still editable or already locked into a payment record.`,
      },
    ],
    whatHappensNext: [
      `After upload, the file can be reused from the library or attached from a draft payment if the workflow needs proof or supporting context.`,
      `If the file becomes part of a non-draft payment record, the document remains visible as part of that payment history.`,
    ],
    rulesAndLimits: [
      `The full library and the draft-payment attachments view are connected, but they do not behave identically.`,
      `Documents attached to a draft payment must be removed from that draft before they can be deleted from Documents.`,
      `Documents attached to non-draft payments remain part of those payment records and cannot be deleted from the document library.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I uploaded a file but do not see it where I want to attach it.`,
        answer: `Return to the document library first and confirm the upload completed successfully. Then reopen the draft payment and check the attachments section again.`,
      },
      {
        question: `The library will not let me delete the document.`,
        answer: `Check whether it is attached to a draft or non-draft payment. Draft attachments must be removed from the draft first, and non-draft attachments stay locked into the payment record.`,
      },
      {
        question: `I am in contract files mode and cannot upload there.`,
        answer: `That mode is intentionally focused on files already tied to the relationship. Use the full document library to upload first, then come back if you need that narrower contract view.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY]: {
    whatThisFeatureDoes: [
      `This guide explains how the Settings page is split between profile details, preferences, verification status, password controls, and session management.`,
      `It is meant to help you make account changes confidently without confusing profile edits, preferences, and security actions.`,
    ],
    whenToUseIt: [
      `Use it when you need to update profile details such as name, phone, company, or address.`,
      `Use it when you want to save theme or preferred currency preferences.`,
      `Use it when you need to create or change a password, review verification status, or manage sessions.`,
    ],
    beforeYouStartDescription: `Open /settings and decide whether the task is about profile details, preferences, verification, password, or session management.`,
    callouts: [
      {
        variant: `info`,
        title: `Settings save in separate sections`,
        body: `Profile details, preferences, and password do not save through a single all-in-one action. Use the button inside the section you actually changed.`,
      },
    ],
    steps: [
      {
        title: `Open the settings area from the shell navigation`,
        body: `Start from the signed-in shell and open /settings. That page loads profile data and account settings together so you can review them side by side.`,
        outcome: `You are in the route that owns account maintenance.`,
      },
      {
        title: `Use the profile section for personal and business details`,
        body:
          `Edit the fields you need, such as first name, last name, phone number, company name, country, city, street, and postal code. Save them with the ` +
          `\`Save profile\`` +
          ` button in that section.`,
        outcome: `Your profile changes are submitted without affecting preferences or password settings.`,
      },
      {
        title: `Use the preferences section for theme and preferred currency`,
        body:
          `Choose the theme option you want, review the shell preview, set the preferred currency, then use ` +
          `\`Save preferences\`` +
          `. Theme changes can appear immediately, but the account preference still needs to be saved.`,
        outcome: `Your display preferences are stored separately from your profile details.`,
      },
      {
        title: `Review verification status before changing password`,
        body: `If the settings page shows a verification card, read its badge and description before taking the next step. Some accounts need profile completion or verification follow-up before higher account access is available.`,
        outcome: `You understand whether account verification needs attention right now.`,
      },
      {
        title: `Use the password section carefully`,
        body: `If your account already has a password, the form will ask for the current password before accepting a new one. If it does not, the same area becomes a create-password flow. The new password must be at least eight characters and the confirmation field must match exactly.`,
        outcome: `You know which fields are required before you submit a password change.`,
      },
      {
        title: `Expect a logout after a successful password change`,
        body: `After a successful password update, the app redirects through logout and shows a login notice. That is normal behavior because password changes revoke active sessions.`,
        outcome: `You are prepared for the sign-out instead of thinking the password flow failed.`,
      },
    ],
    whatHappensNext: [
      `After a profile or preference save, the page refreshes and the updated values should remain visible in the same section.`,
      `After a password change, your next step is to sign back in using the updated credentials or the normal sign-in route for your account.`,
    ],
    rulesAndLimits: [
      `Profile details, preferences, password, and session actions are intentionally split into separate sections with their own save behavior.`,
      `The current-password field only appears when the account already has a password.`,
      `A successful password change signs you out and revokes active sessions; that is expected behavior, not an error.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I changed something, but it does not look saved.`,
        answer:
          `Make sure you used the button for the section you edited. ` +
          `\`Save profile\`` +
          ` does not save preferences, and ` +
          `\`Save preferences\`` +
          ` does not save profile fields.`,
      },
      {
        question: `The password form is asking for a current password, but I expected a simple create-password flow.`,
        answer: `If the account already has a password, the form requires the current password before accepting a new one. If it does not, the same area becomes a create-password experience instead.`,
      },
      {
        question: `I changed my password and got signed out immediately.`,
        answer: `That is expected. Password changes revoke sessions and redirect through logout with a login notice so you can sign in again securely.`,
      },
    ],
    faq: [
      {
        question: `Does choosing ` + `\`System\`` + ` theme still save a preference?`,
        answer:
          `Yes. ` +
          `\`System\`` +
          ` stays tied to your device appearance, but it is still saved as your account preference when you use ` +
          `\`Save preferences\`` +
          `.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS]: {
    whatThisFeatureDoes: [
      `This guide explains how verification appears across the dashboard and settings, what the visible badges mean, and how to react when the app asks you to continue, retry, or wait.`,
      `It is designed to reduce uncertainty around identity checks by focusing on the states you actually see in the workspace rather than backend-only terminology.`,
    ],
    whenToUseIt: [
      `Use it when the dashboard or settings page shows a verification-related banner or card.`,
      `Use it when the app says your profile is incomplete, verification is in review, or more information is required.`,
      `Use it when you want to understand whether you should act now or wait for the state to change.`,
    ],
    beforeYouStartDescription: `Open the dashboard or settings page so you can compare the visible verification badge, title, and action button with the guide.`,
    callouts: [
      {
        variant: `warning`,
        title: `The badge tells you whether to act or wait`,
        body:
          `Verification is state driven. A badge like ` +
          `\`Verified\`` +
          `, ` +
          `\`In review\`` +
          `, ` +
          `\`Action required\`` +
          `, ` +
          `\`In progress\`` +
          `, ` +
          `\`Needs retry\`` +
          `, ` +
          `\`Restart needed\`` +
          `, ` +
          `\`Profile incomplete\`` +
          `, or surface-specific labels such as ` +
          `\`More info required\`` +
          `, ` +
          `\`Not approved\`` +
          `, or ` +
          `\`Review required\`` +
          ` should decide your next step before you click anything else.`,
      },
    ],
    steps: [
      {
        title: `Start from the verification signal already shown in the app`,
        body: `Open the dashboard or settings page and read the verification banner or card first. Those areas summarize the current state and usually expose the next available action.`,
        outcome: `You are working from the latest visible verification context instead of memory.`,
      },
      {
        title: `Check whether your profile must be completed first`,
        body: `If the app says your profile is incomplete, finish the missing profile details in Settings before trying to continue verification. The workspace can block the start of verification until profile details are ready.`,
        outcome: `You avoid retrying verification before the account is eligible to start.`,
      },
      {
        title: `Interpret the visible badge before acting`,
        body:
          `Treat ` +
          `\`Verified\`` +
          ` as complete, ` +
          `\`In review\`` +
          ` as a wait state, ` +
          `\`Action required\`` +
          `, ` +
          `\`In progress\`` +
          `, ` +
          `\`More info required\`` +
          `, ` +
          `\`Not approved\`` +
          `, and ` +
          `\`Review required\`` +
          ` as follow-up states, and ` +
          `\`Restart needed\`` +
          ` or ` +
          `\`Needs retry\`` +
          ` as signals that the flow must be resumed or restarted.`,
        outcome: `You know whether the next move is to wait, continue, retry, or go back to profile details.`,
      },
      {
        title: `Use the visible action only when it matches the current state`,
        body:
          `If the app offers ` +
          `\`Start verification\`` +
          `, ` +
          `\`Continue verification\`` +
          `, ` +
          `\`Retry verification\`` +
          `, or ` +
          `\`Restart verification\`` +
          `, use the action that matches the current badge instead of trying to restart the whole flow blindly.`,
        outcome: `You take the smallest correct action for the state the app is showing.`,
      },
      {
        title: `Return to the dashboard or settings after submitting anything new`,
        body: `After you continue or retry the verification flow, come back to the dashboard or settings card and watch for the next visible state. A follow-up usually moves into review or exposes another required step.`,
        outcome: `You can confirm progress from the same places where verification is summarized.`,
      },
    ],
    whatHappensNext: [
      `After you submit the requested verification information, the workspace usually moves into an in-review or follow-up state.`,
      `Once the account becomes verified, the verification banner changes and previously limited account capabilities can become available.`,
    ],
    rulesAndLimits: [
      `Do not assume ` +
        `\`More info required\`` +
        ` means the process failed; it usually means the current submission needs a targeted follow-up.`,
      `Do not restart the flow if the app already says ` +
        `\`In review\`` +
        `; that badge means the correct next action is usually to wait.`,
      `Verification steps can vary by account state, so the visible workspace signal is more important than a generic checklist.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I thought I finished verification, but the app still shows another step.`,
        answer:
          `Read the current badge carefully. The workspace may now be showing ` +
          `\`In review\`` +
          `, ` +
          `\`More info required\`` +
          `, ` +
          `\`In progress\`` +
          `, or another follow-up state instead of a fully verified state.`,
      },
      {
        question: `I do not know whether to wait or submit something else.`,
        answer:
          `If the app says ` +
          `\`In review\`` +
          `, wait for the state to change. If it says ` +
          `\`Action required\`` +
          `, ` +
          `\`More info required\`` +
          `, ` +
          `\`Needs retry\`` +
          `, ` +
          `\`Restart needed\`` +
          `, or exposes a continue/retry button, follow that exact prompt.`,
      },
      {
        question: `The app tells me to complete my profile first.`,
        answer: `Go to Settings and finish the missing profile fields before trying to start verification again. The workspace can prevent verification from starting until the profile is complete.`,
      },
    ],
    faq: [
      {
        question: `Does every user see the same verification steps?`,
        answer: `Not always. The visible flow can vary by account state, so the current dashboard or settings status should guide your next action.`,
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
  [HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW]: createOverviewArticle({
    featureLabel: `the documents area`,
    routeSummary: `/documents or a payment detail route with attachments`,
    primaryTask: `uploading a file, attaching it to a payment, or reviewing what is already stored`,
    troubleshootingFocus: `upload failures, missing files, and attachment confusion`,
    nextStep: `to open the upload-and-attach guide or the documents troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `documents`,
    issueSurface: `a file will not upload, attach, appear, or stay available where you expected`,
    firstCheck: `Confirm that you are on the correct route, that the file selection actually completed, and that the target payment or document list is the one you intended to update.`,
    recoveryAction: `Retry only after confirming the file, route, and target workflow are correct. If the issue is attachment-specific, compare the payment detail attachments area with the documents list before trying again.`,
    waitState: `Wait only when the route has already accepted the action and is now reflecting the file or attachment asynchronously rather than showing an immediate error.`,
    escalationPath: `Return to the documents overview or upload task guide so you can re-enter the workflow from the correct route with the correct target payment or document list.`,
  }),
  [HELP_GUIDE_SLUG.CONTACTS_OVERVIEW]: createOverviewArticle({
    featureLabel: `saved contacts`,
    routeSummary: `/contacts, /contacts/[contactId]/details, or a contact-aware payment flow`,
    primaryTask: `adding a contact, searching for one, or reusing the correct contact in a related workflow`,
    troubleshootingFocus: `missing search results, stale contact details, and confusing contact reuse`,
    nextStep: `to open the contacts task guide or contracts guidance if the next action is relationship-based`,
  }),
  [HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE]: createTaskArticle({
    taskLabel: `add, search, and use contacts`,
    entrySurface: `/contacts or a flow that points you back into Contacts`,
    requirements: `the contact email and any name or address details you want saved`,
    actionSummary: `Create the contact, update the saved details when needed, and use search or detail review to pick the right record before returning to the workflow that needs it.`,
    completionState: `The correct contact is now saved, searchable, and ready to reuse in the next workspace step.`,
    fallbackGuide: `the contacts troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `contacts`,
    issueSurface: `a contact cannot be found, edited, or reused the way you expected`,
    firstCheck: `Verify the search query, the contact detail route, and whether you are looking for a saved contact versus trying to create a new one from scratch.`,
    recoveryAction: `Open the contact detail view when you need full record context, or return to the list and refine the search if you are only seeing partial matches or older details.`,
    waitState: `Wait only when the route has already accepted your contact update and the UI is refreshing the saved record rather than showing a direct validation or route error.`,
    escalationPath: `Return to the contacts task guide and repeat the flow from the saved-contact surface instead of guessing from a downstream payment or contract route.`,
  }),
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
  [HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW]: {
    whatThisFeatureDoes: [
      `This guide explains how the Exchange workspace is split between the main /exchange hub, the dedicated /exchange/rules page, and the scheduled-conversions surface.`,
      `It focuses on what the consumer actually sees: the convert form, live-rate cards, auto-rule editor, and scheduled-conversion status list.`,
    ],
    whenToUseIt: [
      `Use it when you open Exchange and want to understand which part of the page owns the action you need.`,
      `Use it before converting funds, creating an auto-conversion rule, or reviewing a scheduled conversion.`,
      `Use it when the exchange area is visible but the next step is not obvious yet.`,
    ],
    beforeYouStartDescription: `Open /exchange first so you can compare the guide with the convert form, live-rate cards, auto-rules preview, and scheduled-conversions preview.`,
    callouts: [
      {
        variant: `info`,
        title: `The main Exchange page is the hub`,
        body: `The main route combines immediate conversion, live-rate refresh, and preview panels for rules and scheduled conversions. The dedicated rules and scheduled pages are there when you need full management views.`,
      },
    ],
    steps: [
      {
        title: `Start on the main Exchange route`,
        body: `Use /exchange as the first stop because it shows the immediate convert form, live-rate cards, a rules section, and a scheduled-conversions section on one screen.`,
        outcome: `You can tell whether your next action is a manual conversion, a rules change, or scheduled follow-up.`,
      },
      {
        title: `Separate manual conversion from automation`,
        body: `Treat the convert form as the now-action surface. Treat the rules section as balance-threshold automation. Treat scheduled conversions as future-dated actions that execute later rather than immediately.`,
        outcome: `You avoid mixing one-time conversion steps with automation management.`,
      },
      {
        title: `Use the live-rate cards as reference, not as submission`,
        body: `The live-rate panel helps you refresh the currently displayed pairs without reloading the rest of the page. It is useful for orientation, but the actual quote and conversion actions still happen in the convert form.`,
        outcome: `You understand why rate refresh and quote retrieval are separate controls.`,
      },
      {
        title: `Move into the dedicated rules route when rule management becomes the main task`,
        body: `The rules preview on /exchange is enough for quick review, but /exchange/rules is the better surface when you need to create, edit, pause, enable, or delete rules with full focus.`,
        outcome: `You switch routes only when the workflow becomes rule-centric.`,
      },
      {
        title: `Use the scheduled route for future-dated review and cleanup`,
        body: `If the question is about future execution time, pending vs history filtering, or cancelling a pending scheduled conversion, continue into /exchange/scheduled instead of staying on the main hub.`,
        outcome: `You land on the route that exposes the scheduled-specific controls and statuses.`,
      },
    ],
    whatHappensNext: [
      `After this overview, the usual next step is to either get a quote and convert on /exchange or continue into /exchange/rules for automation management.`,
      `If the problem is not about choosing a route but about a blocked state, use the exchange troubleshooting guide instead of retrying from memory.`,
    ],
    rulesAndLimits: [
      `The same Exchange area exposes several related workflows, but they do not behave the same way.`,
      `Live-rate cards, quotes, immediate conversion, auto-rules, and scheduled conversions are intentionally separate actions with different validation and outcomes.`,
      `When a dedicated route exists, trust the controls and statuses on that route more than the preview state you remember from the main hub.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can see Exchange, but I am not sure where to start.`,
        answer: `Start on /exchange and decide whether you need a one-time conversion now, a rule that keeps a target balance automatically, or a future-dated scheduled conversion.`,
      },
      {
        question: `The main Exchange page looks busy. Do I have to use every section?`,
        answer: `No. The page is a hub. Use only the section that matches your goal, then continue into the dedicated rules or scheduled page if that workflow becomes the main task.`,
      },
      {
        question: `I refreshed live rates, but I still do not have a quote.`,
        answer: `That is expected. Refreshing rate cards updates the reference panel. Use the convert form's quote action when you need a quote for the amount currently entered.`,
      },
    ],
    faq: [
      {
        question: `Should I use /exchange/rules first if I want automation?`,
        answer: `Usually start on /exchange to orient yourself, then move to /exchange/rules when creating or editing rules becomes the main task.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE]: {
    whatThisFeatureDoes: [
      `This guide walks through the real exchange workflow: getting a quote, converting funds now, and managing automation through rules or scheduled conversions.`,
      `It stays grounded in the current UX, including disabled actions for invalid input, insufficient-balance signals, and the rule-management controls on the dedicated rules page.`,
    ],
    whenToUseIt: [
      `Use it when you want to convert funds immediately from /exchange.`,
      `Use it when you need to create, edit, pause, enable, or delete an auto-conversion rule from /exchange/rules.`,
      `Use it when you need to schedule a future conversion and understand which route owns that action.`,
    ],
    beforeYouStartDescription: `Have a positive source balance, choose two different currencies, and decide whether the action should happen now, automatically by rule, or later on a schedule.`,
    callouts: [
      {
        variant: `warning`,
        title: `Quote and convert are separate actions`,
        body: `The convert form can fetch a quote before you submit, but the quote itself does not move funds. Funds only move when you use the convert action and the current balance can support it.`,
      },
    ],
    steps: [
      {
        title: `Use /exchange for one-time conversion`,
        body: `Choose the source and target currencies in the convert form, make sure they differ, and enter an amount greater than zero. The form also shows the available balance for the selected source currency so you can compare your request before submitting.`,
        outcome: `You are using the route that owns immediate conversion and amount validation.`,
      },
      {
        title: `Get a quote when you need confirmation before converting`,
        body: `Use the quote action to preview the current rate, target amount, and source amount for what you entered. This is the safest step when you want to confirm the result before moving funds.`,
        outcome: `You can compare the expected output before committing the conversion.`,
      },
      {
        title: `Convert only when the current balance supports it`,
        body:
          `Use ` +
          `\`Convert now\`` +
          ` only after the amount is valid, the currencies differ, and the requested amount does not exceed the available balance shown on the page. After a successful conversion, the form clears the amount and the page refreshes.`,
        outcome: `Funds are converted through the immediate exchange flow instead of just quoted.`,
      },
      {
        title: `Use /exchange/rules for repeatable balance automation`,
        body: `Open the dedicated rules route when you want to keep a target balance automatically. There you can choose source and target currencies, set a required target balance, optionally cap each execution, define the minimum interval, and decide whether the rule starts enabled immediately.`,
        outcome: `The rule is created or updated in the route designed for rule management rather than one-off conversion.`,
      },
      {
        title: `Manage existing rules from the list, not from memory`,
        body: `Use the rule list actions to edit, pause, enable, or delete an existing rule. The current state of each rule is shown directly in the list, so read that state before changing it.`,
        outcome: `You update automation based on the live rule state already shown in the app.`,
      },
      {
        title: `Use /exchange/scheduled for future execution`,
        body: `If the conversion should happen later, open the scheduled route and set source currency, target currency, amount, and a future execution time. Only pending scheduled conversions can be cancelled later from that list.`,
        outcome: `Future-dated exchange work is stored in the scheduled-conversions flow instead of the immediate convert flow.`,
      },
    ],
    whatHappensNext: [
      `After a successful one-time conversion, the main Exchange page refreshes and the updated state becomes the next source of truth.`,
      `After a rule or scheduled conversion is saved, the matching list becomes the best place to review status, enablement, or pending-versus-history state.`,
    ],
    rulesAndLimits: [
      `Immediate conversion requires two different currencies and an amount greater than zero.`,
      `The convert action is intentionally blocked when the requested amount exceeds the currently available balance.`,
      `Rule creation requires a target balance, allows zero as a valid target, and treats max-convert amount as optional.`,
      `Scheduled conversions require a future date and time; past or invalid values are rejected by the form.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can get a quote, but I still cannot convert.`,
        answer: `Check whether the requested amount is above the available balance or whether the form still has another validation issue. A quote does not bypass convert validation.`,
      },
      {
        question: `The rule form will not save.`,
        answer: `Check that the currencies differ, target balance is present and valid, the optional cap is greater than zero when provided, and the interval is at least 1 minute when filled in.`,
      },
      {
        question: `I scheduled a conversion, but I cannot cancel it anymore.`,
        answer: `Only pending scheduled conversions show the cancel action. Once the record moves into processing, executed, failed, or cancelled history, the route no longer exposes that control.`,
      },
    ],
    faq: [
      {
        question: `Do I need to visit /exchange/rules to create a rule?`,
        answer: `Not always, because the main Exchange page also shows a rules section. Use /exchange/rules when rules are your main task and you want the full focused management surface.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES]: {
    whatThisFeatureDoes: [
      `This troubleshooting guide helps you diagnose the most common blocked states across immediate conversion, rule management, and scheduled conversions.`,
      `It focuses on the actual visible signals: disabled buttons, unavailable rates, validation hints, and scheduled-status labels.`,
    ],
    whenToUseIt: [
      `Use it when Exchange actions are disabled or the next recovery step is unclear.`,
      `Use it when the quote, convert, or rule-save flow fails and you need a cleaner diagnosis path.`,
      `Use it when a scheduled conversion looks stuck, unavailable, or not cancellable anymore.`,
    ],
    beforeYouStartDescription: `Open the exact Exchange route where the problem appears and keep the current validation text, status badge, or disabled action visible while you troubleshoot.`,
    callouts: [
      {
        variant: `warning`,
        title: `Start with the visible validation, not with a retry`,
        body: `Exchange surfaces already expose useful first signals such as same-currency errors, insufficient-balance hints, stale or unavailable rates, and scheduled-status labels. Read those first before resubmitting.`,
      },
    ],
    steps: [
      {
        title: `Confirm you are on the right exchange surface`,
        body: `Use /exchange for quote and immediate conversion, /exchange/rules for rule management, and /exchange/scheduled for future-dated conversions. A blocked action is often just the wrong route for the job.`,
        outcome: `You troubleshoot the workflow that actually owns the action.`,
      },
      {
        title: `Check the most obvious input problem first`,
        body: `On convert and rule forms, make sure the source and target currencies differ. Then verify the amount, target balance, optional cap, or interval field that the form is currently validating.`,
        outcome: `You either clear the direct validation issue or rule it out quickly.`,
      },
      {
        title: `Compare the requested amount with the current balance`,
        body: `If the convert flow says the amount exceeds the available balance, treat that as the primary blocker. The convert action stays disabled until the amount is brought back within the currently available source balance.`,
        outcome: `You stop treating an intentional balance guard as a broken submit button.`,
      },
      {
        title: `Use route-specific recovery for rates and automation`,
        body: `If live rates are unavailable or stale, refresh the rates or retry the quote from the same route. If a rule or scheduled conversion saved successfully, let the list refresh before assuming the mutation failed.`,
        outcome: `You recover based on the behavior of the current surface instead of switching routes blindly.`,
      },
      {
        title: `Read scheduled status before trying to cancel or retry`,
        body: `Pending scheduled conversions can still be cancelled. Historical entries marked executed, failed, processing, or cancelled are no longer in the same editable state, so the route intentionally changes which actions are available.`,
        outcome: `You align the next step with the scheduled record's actual lifecycle state.`,
      },
    ],
    whatHappensNext: [
      `Most exchange problems resolve into one of three outcomes: correct the current input, use the right exchange route, or wait for the accepted state to refresh.`,
      `If the screen still looks wrong after that, capture the visible route, message, and status before escalating so the problem stays tied to the real current state.`,
    ],
    rulesAndLimits: [
      `A disabled exchange action is often correct behavior for the current input or balance state.`,
      `Unavailable or stale rates do not automatically mean the whole exchange area is broken; they can be isolated to the current rate refresh or quote attempt.`,
      `Scheduled conversions do not expose the same actions in every status, and historical entries are intentionally less editable than pending ones.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `Why is the convert button disabled?`,
        answer: `Check the visible form state first: the currencies must differ, the amount must be greater than zero, and the request cannot exceed the available balance shown for the selected source currency.`,
      },
      {
        question: `The rates panel says rates are unavailable. Can I still do anything?`,
        answer: `Retry from the same route first. Refreshing live rates and requesting a quote are separate actions, so use the control that matches what you are trying to recover.`,
      },
      {
        question: `I cannot save or enable a rule the way I expected.`,
        answer: `Review the rule inputs again, especially target balance, optional cap, interval, and whether the currencies differ. Then retry from /exchange/rules or the rules section on /exchange without switching workflows mid-stream.`,
      },
      {
        question: `A scheduled conversion is no longer cancellable.`,
        answer: `Open the scheduled list and read the current status. Only pending items show the cancel action. Processing, executed, failed, or cancelled entries are already in a different lifecycle state.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.SETTINGS_OVERVIEW]: createOverviewArticle({
    featureLabel: `settings`,
    routeSummary: `/settings`,
    primaryTask: `updating profile details, saving preferences, changing password settings, or checking verification state`,
    troubleshootingFocus: `save failures, incomplete profile details, and unclear account notices`,
    nextStep: `to continue with the settings task guide or the related verification guide`,
  }),
  [HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `settings`,
    issueSurface: `profile updates, preferences, password actions, or notices in Settings are unclear or blocked`,
    firstCheck: `Confirm which part of Settings is affected and whether the route is showing a validation problem, a save-state problem, or a verification-related dependency.`,
    recoveryAction: `Correct missing fields and save from the same Settings surface before restarting any related verification or account action.`,
    waitState: `Wait when Settings has already accepted the change and the route is refreshing the saved state rather than showing a direct validation or session error.`,
    escalationPath: `Return to the settings overview or the profile-and-security guide so you can re-enter the workflow from the exact section that owns the change.`,
  }),
  [HELP_GUIDE_SLUG.VERIFICATION_COMPLETE_AND_RECOVER]: createTaskArticle({
    taskLabel: `complete verification and recover from follow-up requests`,
    entrySurface: `/dashboard or /settings`,
    requirements: `the current verification badge, the visible next action, and any profile prerequisites the route is asking you to finish first`,
    actionSummary: `Use the badge and action that the app is showing now to continue, retry, restart, or complete profile requirements instead of forcing the same recovery step every time.`,
    completionState: `Verification moves into the next visible state, whether that is review, another requested follow-up, or a completed verified state.`,
    fallbackGuide: `the verification troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `verification`,
    issueSurface: `verification is stuck in review, asks for more information, or shows a follow-up badge you were not expecting`,
    firstCheck: `Read the exact badge and action shown in Dashboard or Settings before doing anything else. The visible state decides whether you should continue, retry, restart, or wait.`,
    recoveryAction: `If the route says your profile is incomplete, finish Settings first. If it says more information is required, follow that exact prompt instead of restarting the whole verification flow.`,
    waitState: `Wait when the route clearly says the submission is in review. Repeated retries add little value while the visible state is still a review state.`,
    escalationPath: `Return to the verification overview or the settings guide so you can confirm whether the next dependency is verification itself or missing profile setup.`,
  }),
} as const satisfies Record<HelpGuideSlug, HelpGuideArticleContent>;
