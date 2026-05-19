import { type HelpGuideSlug } from '../guide-slugs';
import { type PublicHelpGuideMeta } from '../guide-types';
import { bankingHelpGuideDefinitions } from './banking';
import { contactsHelpGuideDefinitions } from './contacts';
import { contractsHelpGuideDefinitions } from './contracts';
import { dashboardHelpGuideDefinitions } from './dashboard';
import { documentsHelpGuideDefinitions } from './documents';
import { exchangeHelpGuideDefinitions } from './exchange';
import { gettingStartedHelpGuideDefinitions } from './getting-started';
import { paymentsHelpGuideDefinitions } from './payments';
import { settingsHelpGuideDefinitions } from './settings';
import { verificationHelpGuideDefinitions } from './verification';
import { withdrawalHelpGuideDefinitions } from './withdrawal';

export type { HelpGuideSlug };

export type PublicHelpGuideRegistryEntry = PublicHelpGuideMeta<HelpGuideSlug>;

export const publicHelpGuideRegistry: readonly PublicHelpGuideRegistryEntry[] = [
  ...gettingStartedHelpGuideDefinitions,
  ...dashboardHelpGuideDefinitions,
  ...paymentsHelpGuideDefinitions,
  ...documentsHelpGuideDefinitions,
  ...settingsHelpGuideDefinitions,
  ...verificationHelpGuideDefinitions,
  ...contactsHelpGuideDefinitions,
  ...contractsHelpGuideDefinitions,
  ...bankingHelpGuideDefinitions,
  ...withdrawalHelpGuideDefinitions,
  ...exchangeHelpGuideDefinitions,
];

export const publicHelpGuideRegistryBySlug: Record<HelpGuideSlug, PublicHelpGuideRegistryEntry> =
  publicHelpGuideRegistry.reduce(
    (accumulator, guide) => {
      accumulator[guide.slug] = guide;
      return accumulator;
    },
    {} as Record<HelpGuideSlug, PublicHelpGuideRegistryEntry>,
  );
