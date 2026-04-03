import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { buildSignupFlowPath, getSignupFlowRedirect, getSignupQuerySeed } from './routing';

describe(`consumer-mobile signup routing`, () => {
  it(`preserves onboarding query params when building signup flow paths`, () => {
    expect(
      buildSignupFlowPath(`/signup`, {
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: CONTRACTOR_KIND.ENTITY,
        googleSignupToken: `token-1`,
      }),
    ).toBe(`/signup?accountType=CONTRACTOR&contractorKind=ENTITY&googleSignup=1`);

    expect(
      buildSignupFlowPath(`/signup/start`, {
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        googleSignupToken: `token-2`,
      }),
    ).toBe(`/signup/start?accountType=BUSINESS&googleSignup=1`);
  });

  it(`redirects google signup users through missing onboarding steps`, () => {
    expect(
      getSignupFlowRedirect({
        accountType: null,
        contractorKind: null,
        googleSignupToken: `token-1`,
      }),
    ).toBe(`/signup/start?googleSignup=1`);

    expect(
      getSignupFlowRedirect({
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: null,
        googleSignupToken: `token-1`,
      }),
    ).toBe(`/signup/start/contractor-kind?accountType=CONTRACTOR&googleSignup=1`);

    expect(
      getSignupFlowRedirect({
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        googleSignupToken: `token-1`,
      }),
    ).toBeNull();
  });

  it(`parses callback query context for provider hydration`, () => {
    expect(getSignupQuerySeed(`?accountType=CONTRACTOR&contractorKind=INDIVIDUAL&googleSignup=1`)).toEqual({
      accountTypeParam: `CONTRACTOR`,
      contractorKindParam: `INDIVIDUAL`,
      googleSignupToken: `cookie-session`,
      googleSignupHandoff: null,
    });
  });
});
