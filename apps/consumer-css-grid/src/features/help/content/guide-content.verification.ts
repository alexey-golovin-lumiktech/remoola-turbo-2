import { createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const verificationHelpGuideContent = {
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
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
