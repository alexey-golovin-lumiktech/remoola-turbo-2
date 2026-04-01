import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { STEP_NAME } from '../stepNames';
import { getSteps } from './getSteps';
import { normalizeSteps } from './normalizeSteps';

describe(`getSteps`, () => {
  it(`returns business flow steps`, () => {
    const steps = normalizeSteps(getSteps(ACCOUNT_TYPE.BUSINESS, null));

    expect(steps.map((step) => step.name)).toEqual([
      STEP_NAME.SIGNUP_DETAILS,
      STEP_NAME.ENTITY_DETAILS,
      STEP_NAME.ADDRESS_DETAILS,
      STEP_NAME.ORGANIZATION_DETAILS,
    ]);
  });

  it(`returns contractor individual steps`, () => {
    const steps = normalizeSteps(getSteps(ACCOUNT_TYPE.CONTRACTOR, CONTRACTOR_KIND.INDIVIDUAL));

    expect(steps.map((step) => step.name)).toEqual([
      STEP_NAME.SIGNUP_DETAILS,
      STEP_NAME.INDIVIDUAL_DETAILS,
      STEP_NAME.ADDRESS_DETAILS,
    ]);
  });

  it(`returns contractor entity steps`, () => {
    const steps = normalizeSteps(getSteps(ACCOUNT_TYPE.CONTRACTOR, CONTRACTOR_KIND.ENTITY));

    expect(steps.map((step) => step.name)).toEqual([
      STEP_NAME.SIGNUP_DETAILS,
      STEP_NAME.ENTITY_DETAILS,
      STEP_NAME.ADDRESS_DETAILS,
      STEP_NAME.ORGANIZATION_DETAILS,
    ]);
  });
});
