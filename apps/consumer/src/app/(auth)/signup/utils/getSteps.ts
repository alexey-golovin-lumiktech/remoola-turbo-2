import { ACCOUNT_TYPE, CONTRACTOR_KIND, type IAccountType, type IContractorKind } from '../types/account.types';
import { type IStepName, STEP_NAME, type StepMeta } from '../types/step.types';

export type StepsMap = Partial<Record<IStepName, StepMeta>>;

const baseSteps: Record<IStepName, StepMeta> = {
  [STEP_NAME.SIGNUP]: {
    submitted: false,
    stepNumber: 1,
    label: STEP_NAME.SIGNUP,
  },
  [STEP_NAME.PERSONAL]: {
    submitted: false,
    stepNumber: 2,
    label: STEP_NAME.PERSONAL,
  },
  [STEP_NAME.ORGANIZATION]: {
    submitted: false,
    stepNumber: 3,
    label: STEP_NAME.ORGANIZATION,
  },
  [STEP_NAME.ADDRESS]: {
    submitted: false,
    stepNumber: 4,
    label: STEP_NAME.ADDRESS,
  },
} as const;

export const steps = baseSteps;

export const getSteps = (accountType: IAccountType, contractorKind: IContractorKind): StepsMap => {
  switch (accountType) {
    case ACCOUNT_TYPE.BUSINESS: {
      return {
        [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP],
        [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
        [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
      };
    }
    case ACCOUNT_TYPE.CONTRACTOR: {
      switch (contractorKind) {
        case CONTRACTOR_KIND.INDIVIDUAL: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP],
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
          };
        }
        case CONTRACTOR_KIND.ENTITY: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP],
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
            [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
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
