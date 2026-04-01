import { describe, expect, it } from '@jest/globals';

import { getAssistiveAddressPrefill } from './assistivePrefill';

describe(`getAssistiveAddressPrefill`, () => {
  it(`fills only empty address fields from parsed legal address`, () => {
    const updates = getAssistiveAddressPrefill(
      {
        street: ``,
        postalCode: ``,
        country: ``,
        state: `NY`,
        city: ``,
      },
      {
        street: `15 Central Park W Apt 7P`,
        postalCode: `10023`,
        country: `United States`,
        state: `CA`,
        city: `New York`,
      },
    );

    expect(updates).toEqual({
      street: `15 Central Park W Apt 7P`,
      postalCode: `10023`,
      country: `United States`,
      city: `New York`,
    });
  });

  it(`does not overwrite manually edited address fields`, () => {
    const updates = getAssistiveAddressPrefill(
      {
        street: `Manual street`,
        postalCode: `90210`,
        country: `United States`,
        state: `CA`,
        city: `Beverly Hills`,
      },
      {
        street: `Parsed street`,
        postalCode: `10023`,
        country: `Germany`,
        state: `BE`,
        city: `Berlin`,
      },
    );

    expect(updates).toEqual({});
  });
});
