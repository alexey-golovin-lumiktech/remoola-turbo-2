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
    });
  });

  it(`parses US format when state and ZIP have no separating space`, () => {
    const result = parseAddressFromString(`123 Main St, New York, NY10001`);
    expect(result).toEqual({
      street: `123 Main St`,
      city: `New York`,
      state: `NY`,
      postalCode: `10001`,
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
    });
  });
});
