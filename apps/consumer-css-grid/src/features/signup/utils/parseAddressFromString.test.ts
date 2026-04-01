import { describe, expect, it } from '@jest/globals';

import { parseAddressFromString } from './parseAddressFromString';

describe(`parseAddressFromString`, () => {
  it(`parses a north america legal address`, () => {
    expect(
      parseAddressFromString(`15 Central Park W Apt 7P, New York, NY 10023`, { countryHint: `United States` }),
    ).toEqual({
      street: `15 Central Park W Apt 7P`,
      city: `New York`,
      state: `NY`,
      postalCode: `10023`,
      country: `United States`,
    });
  });

  it(`parses a germany address with city and postal in one segment`, () => {
    expect(parseAddressFromString(`Unter den Linden 77, 10117 Berlin, Germany`, { countryHint: `Germany` })).toEqual({
      street: `Unter den Linden 77`,
      city: `Berlin`,
      postalCode: `10117`,
      country: `Germany`,
    });
  });

  it(`falls back safely when a supported-country address still cannot be parsed`, () => {
    expect(parseAddressFromString(`Unstructured address blob, Floor 7`, { countryHint: `United Kingdom` })).toEqual({
      street: `Unstructured address blob, Floor 7`,
      country: `United Kingdom`,
    });
  });
});
