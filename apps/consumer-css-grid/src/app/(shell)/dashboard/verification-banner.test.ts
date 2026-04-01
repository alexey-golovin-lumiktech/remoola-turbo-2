import { describe, expect, it } from '@jest/globals';

import { getVerificationBannerAction, getVerificationBannerState } from './verification-banner';

describe(`dashboard verification banner helpers`, () => {
  it(`preserves the ready-to-start banner semantics for complete profiles`, () => {
    expect(
      getVerificationBannerState(
        {
          effectiveVerified: false,
          profileComplete: true,
          status: `not_started`,
          canStart: true,
        },
        false,
      ),
    ).toMatchObject({
      headline: `Verification ready to start`,
      badge: `Not started`,
    });
  });

  it(`offers profile completion instead of a verification start when the profile is incomplete`, () => {
    expect(
      getVerificationBannerAction(
        {
          effectiveVerified: false,
          profileComplete: false,
          status: `not_started`,
          canStart: false,
        },
        false,
      ),
    ).toEqual({
      kind: `link`,
      href: `/settings`,
      label: `Complete profile`,
    });
  });

  it(`offers continue verification for reusable in-progress states`, () => {
    expect(
      getVerificationBannerAction(
        {
          effectiveVerified: false,
          profileComplete: true,
          status: `requires_input`,
          canStart: true,
        },
        false,
      ),
    ).toEqual({
      kind: `button`,
      label: `Continue verification`,
    });
  });

  it(`offers restart verification for canceled sessions`, () => {
    expect(
      getVerificationBannerAction(
        {
          effectiveVerified: false,
          profileComplete: true,
          status: `canceled`,
          canStart: true,
        },
        false,
      ),
    ).toEqual({
      kind: `button`,
      label: `Restart verification`,
    });
  });

  it(`offers retry verification for review-blocked states only when starts are allowed`, () => {
    expect(
      getVerificationBannerAction(
        {
          effectiveVerified: false,
          profileComplete: true,
          status: `flagged`,
          canStart: true,
        },
        false,
      ),
    ).toEqual({
      kind: `button`,
      label: `Retry verification`,
    });

    expect(
      getVerificationBannerAction(
        {
          effectiveVerified: false,
          profileComplete: true,
          status: `flagged`,
          canStart: false,
        },
        false,
      ),
    ).toBeNull();
  });
});
