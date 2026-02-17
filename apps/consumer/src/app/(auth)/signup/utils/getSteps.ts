import { type TAccountType, type TContractorKind, AccountTypes, ContractorKinds } from '@remoola/api-types';

import { type IStepName, type IStepMeta, STEP_NAME } from '../../../../types';

export type StepsMap = Partial<Record<IStepName, IStepMeta>>;

const baseSteps: Record<IStepName, IStepMeta> = {
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
} as const;

export const steps = baseSteps;

export const getSteps = (accountType: TAccountType, contractorKind: TContractorKind | null): StepsMap => {
  switch (accountType) {
    case AccountTypes.BUSINESS: {
      return {
        [STEP_NAME.SIGNUP_DETAILS]: steps[STEP_NAME.SIGNUP_DETAILS],
        [STEP_NAME.PERSONAL_DETAILS]: steps[STEP_NAME.PERSONAL_DETAILS],
        [STEP_NAME.ADDRESS_DETAILS]: steps[STEP_NAME.ADDRESS_DETAILS],
        [STEP_NAME.ORGANIZATION_DETAILS]: steps[STEP_NAME.ORGANIZATION_DETAILS],
      };
    }
    case AccountTypes.CONTRACTOR: {
      switch (contractorKind) {
        case ContractorKinds.INDIVIDUAL: {
          return {
            [STEP_NAME.SIGNUP_DETAILS]: steps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.PERSONAL_DETAILS]: steps[STEP_NAME.PERSONAL_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: steps[STEP_NAME.ADDRESS_DETAILS],
          };
        }
        case ContractorKinds.ENTITY: {
          return {
            [STEP_NAME.SIGNUP_DETAILS]: steps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.PERSONAL_DETAILS]: steps[STEP_NAME.PERSONAL_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: steps[STEP_NAME.ADDRESS_DETAILS],
            [STEP_NAME.ORGANIZATION_DETAILS]: steps[STEP_NAME.ORGANIZATION_DETAILS],
          };
        }
        case null:
          return {};
        default:
          throw new Error(`Unexpected contractor kind: "${contractorKind}"`);
      }
    }
    default:
      throw new Error(`Unexpected account type: "${accountType}"`);
  }
};
