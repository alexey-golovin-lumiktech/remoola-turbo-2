import { parseAddressFromString } from './parseAddressFromString';

describe(`parseAddressFromString`, () => {
  it(`parses common apartment-style US legal addresses`, () => {
    const result = parseAddressFromString(`15 Central Park W Apt 7P, New York, NY 10023`);
    expect(result).toEqual({
      street: `15 Central Park W Apt 7P`,
      city: `New York`,
      state: `NY`,
      postalCode: `10023`,
      country: `United States`,
    });
  });

  it(`parses Canadian legal addresses and infers country`, () => {
    const result = parseAddressFromString(`111 Wellington St, Ottawa, ON K1A 0B1`);
    expect(result).toEqual({
      street: `111 Wellington St`,
      city: `Ottawa`,
      state: `ON`,
      postalCode: `K1A 0B1`,
      country: `Canada`,
    });
  });

  it(`parses United Kingdom format with postcode segment`, () => {
    const result = parseAddressFromString(`221B Baker Street, London, NW1 6XE, United Kingdom`);
    expect(result).toEqual({
      street: `221B Baker Street`,
      city: `London`,
      postalCode: `NW1 6XE`,
      country: `United Kingdom`,
    });
  });

  it(`parses Russia format when country hint is provided`, () => {
    const result = parseAddressFromString(`Tverskaya St 7, Moscow, Moscow Oblast, 125009`, {
      countryHint: `Russia`,
    });
    expect(result).toEqual({
      street: `Tverskaya St 7`,
      city: `Moscow`,
      state: `Moscow Oblast`,
      postalCode: `125009`,
      country: `Russia`,
    });
  });

  it(`parses Germany format with postal code and city in one segment`, () => {
    const result = parseAddressFromString(`Friedrichstrasse 123, 10117 Berlin, Germany`);
    expect(result).toEqual({
      street: `Friedrichstrasse 123`,
      city: `Berlin`,
      postalCode: `10117`,
      country: `Germany`,
    });
  });

  it(`falls back safely for ambiguous supported-country formats`, () => {
    const result = parseAddressFromString(`Unter den Linden 77, Berlin Mitte`, {
      countryHint: `Germany`,
    });
    expect(result).toEqual({
      street: `Unter den Linden 77, Berlin Mitte`,
      country: `Germany`,
    });
  });
});
