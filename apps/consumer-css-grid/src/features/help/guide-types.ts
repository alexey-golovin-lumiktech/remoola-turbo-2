export const HELP_GUIDE_TYPE = {
  OVERVIEW: `overview`,
  TASK: `task`,
  TROUBLESHOOTING: `troubleshooting`,
} as const;

export type HelpGuideType = (typeof HELP_GUIDE_TYPE)[keyof typeof HELP_GUIDE_TYPE];

export const HELP_GUIDE_CATEGORY = {
  GETTING_STARTED: `getting_started`,
  DASHBOARD: `dashboard`,
  PAYMENTS: `payments`,
  DOCUMENTS: `documents`,
  CONTACTS_AND_CONTRACTS: `contacts_and_contracts`,
  BANKING_AND_WITHDRAWAL: `banking_and_withdrawal`,
  EXCHANGE: `exchange`,
  SETTINGS_AND_PROFILE: `settings_and_profile`,
  VERIFICATION_AND_SECURITY: `verification_and_security`,
} as const;

export type HelpGuideCategory = (typeof HELP_GUIDE_CATEGORY)[keyof typeof HELP_GUIDE_CATEGORY];

export const HELP_GUIDE_FEATURE = {
  WORKSPACE: `workspace`,
  DASHBOARD: `dashboard`,
  PAYMENTS: `payments`,
  DOCUMENTS: `documents`,
  CONTACTS: `contacts`,
  CONTRACTS: `contracts`,
  BANKING: `banking`,
  WITHDRAWAL: `withdrawal`,
  EXCHANGE: `exchange`,
  SETTINGS: `settings`,
  VERIFICATION: `verification`,
} as const;

export type HelpGuideFeature = (typeof HELP_GUIDE_FEATURE)[keyof typeof HELP_GUIDE_FEATURE];

export const HELP_AUDIENCE_STATE = {
  GUEST: `guest`,
  AUTHENTICATED: `authenticated`,
  BOTH: `both`,
} as const;

type HelpAudienceState = (typeof HELP_AUDIENCE_STATE)[keyof typeof HELP_AUDIENCE_STATE];

export const HELP_GUIDE_SOURCE_REF_KIND = {
  FRONTEND_ROUTE: `frontend_route`,
  FRONTEND_FILE: `frontend_file`,
  API_SURFACE: `api_surface`,
  SHARED_CONTRACT: `shared_contract`,
  PLANNING_DOC: `planning_doc`,
} as const;

type HelpGuideSourceRefKind = (typeof HELP_GUIDE_SOURCE_REF_KIND)[keyof typeof HELP_GUIDE_SOURCE_REF_KIND];

export type HelpRouteAffinity = `/${string}`;

export interface HelpGuideSourceRef {
  kind: HelpGuideSourceRefKind;
  ref: string;
  note?: string;
}

export interface PublicHelpGuideMeta<TSlug extends string = string> {
  slug: TSlug;
  guideType: HelpGuideType;
  title: string;
  summary: string;
  category: HelpGuideCategory;
  feature: HelpGuideFeature;
  audienceState: HelpAudienceState;
  routeAffinity: readonly HelpRouteAffinity[];
  order: number;
  prerequisites: readonly string[];
  relatedGuides: readonly TSlug[];
}

export interface InternalHelpGuideMeta<TSlug extends string = string> extends PublicHelpGuideMeta<TSlug> {
  sourceRefs: readonly HelpGuideSourceRef[];
}

export type HelpGuideDefinition<TSlug extends string = string> = PublicHelpGuideMeta<TSlug>;

export interface HelpGuideSourceMapEntry<TSlug extends string = string> {
  slug: TSlug;
  feature: HelpGuideFeature;
  routes: readonly HelpRouteAffinity[];
  frontendFiles: readonly string[];
  frontendDataHelpers: readonly string[];
  backendSurfaces: readonly string[];
  sharedContracts: readonly string[];
  planningDocs: readonly string[];
  notes: readonly string[];
}
