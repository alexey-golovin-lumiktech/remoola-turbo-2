export const AccountTypes = {
  BUSINESS: `BUSINESS`,
  CONTRACTOR: `CONTRACTOR`,
} as const;
export type TAccountType = (typeof AccountTypes)[keyof typeof AccountTypes];

export const ContractorKinds = {
  ENTITY: `ENTITY`,
  INDIVIDUAL: `INDIVIDUAL`,
} as const;
export type TContractorKind = (typeof ContractorKinds)[keyof typeof ContractorKinds];

export const LegalStatuses = {
  INDIVIDUAL: `INDIVIDUAL`,
  INDIVIDUAL_ENTREPRENEUR: `INDIVIDUAL_ENTREPRENEUR`,
  SOLE_TRADER: `SOLE_TRADER`,
} as const;
export type TLegalStatus = (typeof LegalStatuses)[keyof typeof LegalStatuses];

export const OrganizationSizes = {
  SMALL: `SMALL`,
  MEDIUM: `MEDIUM`,
  LARGE: `LARGE`,
} as const;
export type TOrganizationSize = (typeof OrganizationSizes)[keyof typeof OrganizationSizes];

export const ConsumerRoles = {
  FOUNDER: `FOUNDER`,
  FINANCE: `FINANCE`,
  MARKETING: `MARKETING`,
  CUSTOMER_SUPPORT: `CUSTOMER_SUPPORT`,
  SALES: `SALES`,
  LEGAL: `LEGAL`,
  HUMAN_RESOURCE: `HUMAN_RESOURCE`,
  OPERATIONS: `OPERATIONS`,
  COMPLIANCE: `COMPLIANCE`,
  PRODUCT: `PRODUCT`,
  ENGINEERING: `ENGINEERING`,
  ANALYSIS_DATA: `ANALYSIS_DATA`,
  OTHER: `OTHER`,
} as const;
export type TConsumerRole = (typeof ConsumerRoles)[keyof typeof ConsumerRoles];

export const HowDidHearAboutUsValues = {
  EMPLOYER_COMPANY: `EMPLOYER_COMPANY`,
  EMPLOYEE_CONTRACTOR: `EMPLOYEE_CONTRACTOR`,
  REFERRED_RECOMMENDED: `REFERRED_RECOMMENDED`,
  EMAIL_INVITE: `EMAIL_INVITE`,
  GOOGLE: `GOOGLE`,
  FACEBOOK: `FACEBOOK`,
  TWITTER: `TWITTER`,
  LINKED_IN: `LINKED_IN`,
  OTHER: `OTHER`,
} as const;
export type THowDidHearAboutUs = (typeof HowDidHearAboutUsValues)[keyof typeof HowDidHearAboutUsValues];

export const VerificationStatuses = {
  PENDING: `PENDING`,
  APPROVED: `APPROVED`,
  MORE_INFO: `MORE_INFO`,
  REJECTED: `REJECTED`,
  FLAGGED: `FLAGGED`,
} as const;
export type TVerificationStatus = (typeof VerificationStatuses)[keyof typeof VerificationStatuses];
