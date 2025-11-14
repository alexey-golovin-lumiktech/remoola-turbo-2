import { ACCOUNT_TYPE, type IAccountType, type IContractorKind, CONTRACTOR_KIND } from '../signup';

export type IStepperContext = {};

export const STEP_NAME = {
  SIGNUP: `signup details`,
  PERSONAL: `personal details`,
  ORGANIZATION: `organization details`,
  ADDRESS: `address details`,
} as const;
type IStepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

const steps = {
  [STEP_NAME.SIGNUP]: {
    submitted: false,
    stepNumber: 2,
    label: STEP_NAME.SIGNUP,
  },
  [STEP_NAME.PERSONAL]: {
    submitted: false,
    stepNumber: 3,
    label: STEP_NAME.PERSONAL,
  },
  [STEP_NAME.ORGANIZATION]: {
    stepNumber: 4,
    submitted: false,
    label: STEP_NAME.ORGANIZATION,
  },
  [STEP_NAME.ADDRESS]: {
    stepNumber: 4,
    submitted: false,
    label: STEP_NAME.ADDRESS,
  },
} as const;
const accountTypeSteps = {
  [ACCOUNT_TYPE.BUSINESS]: {
    [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
    [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
    [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
  },
  [ACCOUNT_TYPE.CONTRACTOR]: {
    [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
    [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
    [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
  },
} as const;

const getSteps = (accountType: IAccountType, contractorKind: IContractorKind) => {
  switch (accountType) {
    case ACCOUNT_TYPE.BUSINESS: {
      return {
        [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
        [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
        [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
      };
    }
    case ACCOUNT_TYPE.CONTRACTOR: {
      switch (contractorKind) {
        case CONTRACTOR_KIND.INDIVIDUAL: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
          };
        }
        case CONTRACTOR_KIND.ENTITY: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
            [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
          };
        }
        default:
          throw new Error(`Unexpected contractor kind`);
      }
    }
    default:
      throw new Error(`Unexpected account type`);
  }
};
