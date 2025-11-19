export const CONTRACTOR_KIND = {
  ENTITY: `ENTITY`,
  INDIVIDUAL: `INDIVIDUAL`,
} as const;

export type IContractorKind = (typeof CONTRACTOR_KIND)[keyof typeof CONTRACTOR_KIND];
