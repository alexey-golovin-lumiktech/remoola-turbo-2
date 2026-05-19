import { type HelpGuideArticleContent } from './guide-content-types';

export interface OverviewArticleTemplate {
  featureLabel: string;
  routeSummary: string;
  primaryTask: string;
  troubleshootingFocus: string;
  nextStep: string;
}

export interface TaskArticleTemplate {
  taskLabel: string;
  entrySurface: string;
  requirements: string;
  actionSummary: string;
  completionState: string;
  fallbackGuide: string;
}

export interface TroubleshootingArticleTemplate {
  featureLabel: string;
  issueSurface: string;
  firstCheck: string;
  recoveryAction: string;
  waitState: string;
  escalationPath: string;
}

export function createOverviewArticle({
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

export function createTaskArticle({
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

export function createTroubleshootingArticle({
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
