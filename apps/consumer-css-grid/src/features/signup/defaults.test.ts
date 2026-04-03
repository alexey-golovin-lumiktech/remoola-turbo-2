import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { createInitialSignupFormState } from './defaults';

describe(`createInitialSignupFormState`, () => {
  it(`starts all branch-defining fields as explicit null`, () => {
    const state = createInitialSignupFormState();

    expect(state.signupDetails.accountType).toBeNull();
    expect(state.signupDetails.contractorKind).toBeNull();
    expect(state.signupDetails.howDidHearAboutUs).toBeNull();
    expect(state.individualDetails.legalStatus).toBeNull();
    expect(state.organizationDetails.size).toBeNull();
    expect(state.organizationDetails.consumerRole).toBeNull();
    expect(state.googleSignupToken).toBeNull();
  });

  it(`hydrates account branch and google token from a valid query seed`, () => {
    const state = createInitialSignupFormState({
      accountTypeParam: ACCOUNT_TYPE.CONTRACTOR,
      contractorKindParam: CONTRACTOR_KIND.ENTITY,
      googleSignup: `1`,
    });

    expect(state.signupDetails.accountType).toBe(ACCOUNT_TYPE.CONTRACTOR);
    expect(state.signupDetails.contractorKind).toBe(CONTRACTOR_KIND.ENTITY);
    expect(state.googleSignupToken).toBe(`cookie-session`);
  });

  it(`ignores contractor kind when the seeded account type is not contractor`, () => {
    const state = createInitialSignupFormState({
      accountTypeParam: ACCOUNT_TYPE.BUSINESS,
      contractorKindParam: CONTRACTOR_KIND.INDIVIDUAL,
    });

    expect(state.signupDetails.accountType).toBe(ACCOUNT_TYPE.BUSINESS);
    expect(state.signupDetails.contractorKind).toBeNull();
  });
});
