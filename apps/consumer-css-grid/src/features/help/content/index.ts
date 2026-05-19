import { type HelpGuideArticleContent } from '../guide-content-types';
import { type HelpGuideSlug } from '../guide-slugs';
import { bankingHelpGuideContent } from './guide-content.banking';
import { contactsHelpGuideContent } from './guide-content.contacts';
import { contractsHelpGuideContent } from './guide-content.contracts';
import { dashboardHelpGuideContent } from './guide-content.dashboard';
import { documentsHelpGuideContent } from './guide-content.documents';
import { exchangeHelpGuideContent } from './guide-content.exchange';
import { gettingStartedHelpGuideContent } from './guide-content.getting-started';
import { paymentsHelpGuideContent } from './guide-content.payments';
import { settingsHelpGuideContent } from './guide-content.settings';
import { verificationHelpGuideContent } from './guide-content.verification';
import { withdrawalHelpGuideContent } from './guide-content.withdrawal';

export const helpGuideContentBySlug = {
  ...gettingStartedHelpGuideContent,
  ...dashboardHelpGuideContent,
  ...paymentsHelpGuideContent,
  ...documentsHelpGuideContent,
  ...settingsHelpGuideContent,
  ...verificationHelpGuideContent,
  ...contactsHelpGuideContent,
  ...contractsHelpGuideContent,
  ...bankingHelpGuideContent,
  ...withdrawalHelpGuideContent,
  ...exchangeHelpGuideContent,
} as const satisfies Record<HelpGuideSlug, HelpGuideArticleContent>;
