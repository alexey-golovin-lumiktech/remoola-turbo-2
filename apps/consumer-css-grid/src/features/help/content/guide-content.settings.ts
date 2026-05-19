import { createOverviewArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const settingsHelpGuideContent = {
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
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
