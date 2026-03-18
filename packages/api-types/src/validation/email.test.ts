import { emailOptionalSchema, emailSchema, isValidEmail } from './email';

describe(`email validation`, () => {
  describe(`isValidEmail`, () => {
    it(`accepts email with dot in local part`, () => {
      expect(isValidEmail(`some.email@asdasd.com`)).toBe(true);
    });

    it(`accepts valid addresses`, () => {
      expect(isValidEmail(`user@domain.co`)).toBe(true);
      expect(isValidEmail(`x@y.z`)).toBe(true);
      expect(isValidEmail(`  user@example.org  `)).toBe(true);
    });

    it(`rejects empty or whitespace`, () => {
      expect(isValidEmail(``)).toBe(false);
      expect(isValidEmail(`   `)).toBe(false);
    });

    it(`rejects invalid format`, () => {
      expect(isValidEmail(`no-at-sign`)).toBe(false);
      expect(isValidEmail(`@nodomain.com`)).toBe(false);
      expect(isValidEmail(`noaddot@domain`)).toBe(false);
    });

    it(`rejects over 254 characters`, () => {
      expect(isValidEmail(`a`.repeat(255))).toBe(false);
      expect(isValidEmail(`a`.repeat(254))).toBe(false);
      expect(isValidEmail(`u@d.` + `c`.repeat(250))).toBe(true);
    });
  });

  describe(`emailSchema`, () => {
    it(`parses valid email with dot in local part`, () => {
      expect(emailSchema.parse(`some.email@asdasd.com`)).toBe(`some.email@asdasd.com`);
    });

    it(`rejects empty string`, () => {
      expect(() => emailSchema.parse(``)).toThrow();
    });

    it(`rejects invalid format`, () => {
      expect(() => emailSchema.parse(`invalid`)).toThrow();
    });
  });

  describe(`emailOptionalSchema`, () => {
    it(`accepts empty string`, () => {
      expect(emailOptionalSchema.parse(``)).toBe(``);
    });

    it(`accepts valid email`, () => {
      expect(emailOptionalSchema.parse(`a@b.co`)).toBe(`a@b.co`);
    });

    it(`rejects invalid format when non-empty`, () => {
      expect(() => emailOptionalSchema.parse(`bad`)).toThrow();
    });
  });
});
