import { type HelpGuideSlug } from '../guide-slugs';
import { type HelpGuideSourceMapEntry } from '../guide-types';
import { bankingGuideSourceMap } from './guide-source-map.banking';
import { contactsGuideSourceMap } from './guide-source-map.contacts';
import { contractsGuideSourceMap } from './guide-source-map.contracts';
import { dashboardGuideSourceMap } from './guide-source-map.dashboard';
import { documentsGuideSourceMap } from './guide-source-map.documents';
import { exchangeGuideSourceMap } from './guide-source-map.exchange';
import { gettingStartedGuideSourceMap } from './guide-source-map.getting-started';
import { paymentsGuideSourceMap } from './guide-source-map.payments';
import { settingsGuideSourceMap } from './guide-source-map.settings';
import { verificationGuideSourceMap } from './guide-source-map.verification';
import { withdrawalGuideSourceMap } from './guide-source-map.withdrawal';
import { makeGetGuideSourceRefs } from './source-map-utils';

export const helpGuideSourceMap = [
  ...gettingStartedGuideSourceMap,
  ...dashboardGuideSourceMap,
  ...paymentsGuideSourceMap,
  ...documentsGuideSourceMap,
  ...contactsGuideSourceMap,
  ...contractsGuideSourceMap,
  ...bankingGuideSourceMap,
  ...withdrawalGuideSourceMap,
  ...exchangeGuideSourceMap,
  ...settingsGuideSourceMap,
  ...verificationGuideSourceMap,
] as const satisfies readonly HelpGuideSourceMapEntry<HelpGuideSlug>[];

export const getGuideSourceRefs = makeGetGuideSourceRefs(helpGuideSourceMap);
