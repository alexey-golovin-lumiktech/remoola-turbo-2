import { createOverviewArticle, createTaskArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const contactsHelpGuideContent = {
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
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
