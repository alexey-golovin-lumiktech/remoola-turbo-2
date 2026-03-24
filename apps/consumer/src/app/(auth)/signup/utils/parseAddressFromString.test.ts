import { parseAddressFromString } from './parseAddressFromString';

describe(`parseAddressFromString`, () => {
  it(`parses US format with country`, () => {
    const result = parseAddressFromString(`1234 Maple Street, Apt 5B, Springfield, IL 62704, United States`);
    expect(result).toEqual({
      street: `1234 Maple Street, Apt 5B`,
      city: `Springfield`,
      state: `IL`,
      postalCode: `62704`,
      country: `United States`,
    });
  });

  it(`parses US format without country`, () => {
    const result = parseAddressFromString(`123 Main St, New York, NY 10001`);
    expect(result).toEqual({
      street: `123 Main St`,
      city: `New York`,
      state: `NY`,
      postalCode: `10001`,
      country: `United States`,
    });
  });

  it(`parses US format when state and ZIP have no separating space`, () => {
    const result = parseAddressFromString(`123 Main St, New York, NY10001`);
    expect(result).toEqual({
      street: `123 Main St`,
      city: `New York`,
      state: `NY`,
      postalCode: `10001`,
      country: `United States`,
    });
  });

  it(`parses Canadian format with postal code`, () => {
    const result = parseAddressFromString(`111 Wellington St, Ottawa, ON K1A 0B1, Canada`);
    expect(result).toEqual({
      street: `111 Wellington St`,
      city: `Ottawa`,
      state: `ON`,
      postalCode: `K1A 0B1`,
      country: `Canada`,
    });
  });

  it(`parses United Kingdom format with postcode segment`, () => {
    const result = parseAddressFromString(`221B Baker Street, London, NW1 6XE, UK`);
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

  it(`returns street only for single part`, () => {
    const result = parseAddressFromString(`123 Main Street`);
    expect(result).toEqual({ street: `123 Main Street` });
  });

  it(`returns empty for empty string`, () => {
    const result = parseAddressFromString(``);
    expect(result).toEqual({});
  });

  it(`returns empty for whitespace-only input`, () => {
    const result = parseAddressFromString(`   \n\t  `);
    expect(result).toEqual({});
  });

  it(`handles malformed address (single comma-separated part)`, () => {
    const result = parseAddressFromString(`123 Main St,`);
    expect(result.street).toBeDefined();
  });

  it(`handles address with extra commas`, () => {
    const result = parseAddressFromString(`123 Main St,, New York, NY 10001`);
    expect(result).toEqual({
      street: `123 Main St`,
      city: `New York`,
      state: `NY`,
      postalCode: `10001`,
      country: `United States`,
    });
  });

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
