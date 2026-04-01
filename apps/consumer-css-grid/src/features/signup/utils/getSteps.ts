import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TAccountType, type TContractorKind } from '@remoola/api-types';

import { STEP_NAME, type StepMeta, type StepName } from '../stepNames';

export type StepsMap = Partial<Record<StepName, StepMeta>>;

const baseSteps: Record<StepName, StepMeta> = {
  [STEP_NAME.SIGNUP_DETAILS]: { label: `Signup`, submitted: false },
  [STEP_NAME.INDIVIDUAL_DETAILS]: { label: `Personal`, submitted: false },
  [STEP_NAME.ENTITY_DETAILS]: { label: `Entity`, submitted: false },
  [STEP_NAME.ADDRESS_DETAILS]: { label: `Address`, submitted: false },
  [STEP_NAME.ORGANIZATION_DETAILS]: { label: `Organization`, submitted: false },
};

export function getSteps(accountType: TAccountType, contractorKind: TContractorKind | null): StepsMap {
  switch (accountType) {
    case ACCOUNT_TYPE.BUSINESS:
      return {
        [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
        [STEP_NAME.ENTITY_DETAILS]: baseSteps[STEP_NAME.ENTITY_DETAILS],
        [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
        [STEP_NAME.ORGANIZATION_DETAILS]: baseSteps[STEP_NAME.ORGANIZATION_DETAILS],
      };
    case ACCOUNT_TYPE.CONTRACTOR:
      switch (contractorKind) {
        case CONTRACTOR_KIND.INDIVIDUAL:
          return {
            [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.INDIVIDUAL_DETAILS]: baseSteps[STEP_NAME.INDIVIDUAL_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
          };
        case CONTRACTOR_KIND.ENTITY:
          return {
            [STEP_NAME.SIGNUP_DETAILS]: baseSteps[STEP_NAME.SIGNUP_DETAILS],
            [STEP_NAME.ENTITY_DETAILS]: baseSteps[STEP_NAME.ENTITY_DETAILS],
            [STEP_NAME.ADDRESS_DETAILS]: baseSteps[STEP_NAME.ADDRESS_DETAILS],
            [STEP_NAME.ORGANIZATION_DETAILS]: baseSteps[STEP_NAME.ORGANIZATION_DETAILS],
          };
        default:
          return {};
      }
    default:
      return {};
  }
}
