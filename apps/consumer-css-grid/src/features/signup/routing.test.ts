import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { getSignupFlowRedirect } from './routing';

describe(`getSignupFlowRedirect`, () => {
  it(`redirects to signup start when account type has not been chosen`, () => {
    expect(
      getSignupFlowRedirect({
        accountType: null,
        contractorKind: null,
        googleSignupToken: null,
      }),
    ).toBe(`/signup/start`);
  });

  it(`redirects contractor users to contractor-kind selection instead of forcing a default`, () => {
    expect(
      getSignupFlowRedirect({
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: null,
        googleSignupToken: `token`,
      }),
    ).toBe(`/signup/start/contractor-kind?accountType=CONTRACTOR&googleSignupToken=token`);
  });

  it(`allows business and fully specified contractor flows through without redirect`, () => {
    expect(
      getSignupFlowRedirect({
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        googleSignupToken: null,
      }),
    ).toBeNull();

    expect(
      getSignupFlowRedirect({
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: CONTRACTOR_KIND.ENTITY,
        googleSignupToken: null,
      }),
    ).toBeNull();
  });
});
