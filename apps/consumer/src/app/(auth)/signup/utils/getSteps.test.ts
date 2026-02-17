import { AccountTypes, ContractorKinds } from '@remoola/api-types';

import { getSteps } from './getSteps';
import { STEP_NAME } from '../../../../types';

describe(`getSteps`, () => {
  describe(`Business signup flow`, () => {
    it(`returns Signup -> Personal (Entity) -> Address -> Organization`, () => {
      const steps = getSteps(AccountTypes.BUSINESS, null);
      expect(steps).toEqual({
        [STEP_NAME.SIGNUP_DETAILS]: expect.objectContaining({ stepNumber: 1 }),
        [STEP_NAME.PERSONAL_DETAILS]: expect.objectContaining({ stepNumber: 2 }),
        [STEP_NAME.ADDRESS_DETAILS]: expect.objectContaining({ stepNumber: 4 }),
        [STEP_NAME.ORGANIZATION_DETAILS]: expect.objectContaining({ stepNumber: 3 }),
      });
      expect(Object.keys(steps)).toHaveLength(4);
    });
  });

  describe(`Contractor Individual signup flow`, () => {
    it(`returns Signup -> Personal -> Address (no Organization)`, () => {
      const steps = getSteps(AccountTypes.CONTRACTOR, ContractorKinds.INDIVIDUAL);
      expect(steps).toEqual({
        [STEP_NAME.SIGNUP_DETAILS]: expect.objectContaining({ stepNumber: 1 }),
        [STEP_NAME.PERSONAL_DETAILS]: expect.objectContaining({ stepNumber: 2 }),
        [STEP_NAME.ADDRESS_DETAILS]: expect.objectContaining({ stepNumber: 4 }),
      });
      expect(steps[STEP_NAME.ORGANIZATION_DETAILS]).toBeUndefined();
      expect(Object.keys(steps)).toHaveLength(3);
    });
  });

  describe(`Contractor Entity signup flow`, () => {
    it(`returns Signup -> Personal (Entity) -> Address -> Organization`, () => {
      const steps = getSteps(AccountTypes.CONTRACTOR, ContractorKinds.ENTITY);
      expect(steps).toEqual({
        [STEP_NAME.SIGNUP_DETAILS]: expect.objectContaining({ stepNumber: 1 }),
        [STEP_NAME.PERSONAL_DETAILS]: expect.objectContaining({ stepNumber: 2 }),
        [STEP_NAME.ADDRESS_DETAILS]: expect.objectContaining({ stepNumber: 4 }),
        [STEP_NAME.ORGANIZATION_DETAILS]: expect.objectContaining({ stepNumber: 3 }),
      });
      expect(Object.keys(steps)).toHaveLength(4);
    });
  });

  describe(`edge cases`, () => {
    it(`returns empty object when Contractor has null contractorKind`, () => {
      const steps = getSteps(AccountTypes.CONTRACTOR, null);
      expect(steps).toEqual({});
    });

    it(`throws when contractorKind is unexpected`, () => {
      expect(() => getSteps(AccountTypes.CONTRACTOR, `UNKNOWN` as any)).toThrow(`Unexpected contractor kind`);
    });
  });
});
