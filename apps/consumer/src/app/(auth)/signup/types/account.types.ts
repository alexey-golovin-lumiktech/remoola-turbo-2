export const ACCOUNT_TYPE = {
  BUSINESS: `BUSINESS`,
  CONTRACTOR: `CONTRACTOR`,
} as const;
export type IAccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];
