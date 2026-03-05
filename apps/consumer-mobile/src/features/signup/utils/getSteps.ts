import { type TAccountType, type TContractorKind, ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { type StepMeta, type StepName, STEP_NAME } from '../stepNames';

export type StepsMap = Partial<Record<StepName, StepMeta>>;

const baseSteps: Record<StepName, StepMeta> = {
  [STEP_NAME.SIGNUP_DETAILS]: {
    submitted: false,
    stepNumber: 1,
    label: STEP_NAME.SIGNUP_DETAILS,
  },
  [STEP_NAME.PERSONAL_DETAILS]: {
    submitted: false,
    stepNumber: 2,
    label: STEP_NAME.PERSONAL_DETAILS,
  },
  [STEP_NAME.ORGANIZATION_DETAILS]: {
    submitted: false,
    stepNumber: 3,
    label: STEP_NAME.ORGANIZATION_DETAILS,
  },
  [STEP_NAME.ADDRESS_DETAILS]: {
    submitted: false,
    stepNumber: 4,
    label: STEP_NAME.ADDRESS_DETAILS,
  },
};

/** Returns step config for the given account type. Order: Business = Signup → Personal → Address → Org. */
export function getSteps(accountType: TAccountType, contractorKind: TContractorKind | null): StepsMap {
  switch (accountType) {
    case ACCOUNT_TYPE.BUSINESS:
      return {
        [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
        [STEP_NAME.PERSONAL_DETAILS]: baseSteps[STEP_NAME.PERSONAL_DETAILS],
        [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
        [STEP_NAME.ORGANIZATION_DETAILS]: baseSteps[STEP_NAME.ORGANIZATION_DETAILS],
      };
    case ACCOUNT_TYPE.CONTRACTOR:
      switch (contractorKind) {
        case CONTRACTOR_KIND.INDIVIDUAL:
          return {
            [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.PERSONAL_DETAILS]: baseSteps[STEP_NAME.PERSONAL_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
          };
        case CONTRACTOR_KIND.ENTITY:
          return {
            [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.PERSONAL_DETAILS]: baseSteps[STEP_NAME.PERSONAL_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
            [STEP_NAME.ORGANIZATION_DETAILS]: baseSteps[STEP_NAME.ORGANIZATION_DETAILS],
          };
        case null:
          return {};
        default:
          throw new Error(`Unexpected contractor kind: "${String(contractorKind)}"`);
      }
    default:
      throw new Error(`Unexpected account type: "${String(accountType)}"`);
  }
}
