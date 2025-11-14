export const ACCOUNT_TYPE = {
  BUSINESS: `BUSINESS`,
  CONTRACTOR: `CONTRACTOR`,
} as const;
export type IAccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

export const CONTRACTOR_KIND = {
  ENTITY: `ENTITY`,
  INDIVIDUAL: `INDIVIDUAL`,
} as const;

export type IContractorKind = (typeof CONTRACTOR_KIND)[keyof typeof CONTRACTOR_KIND];
