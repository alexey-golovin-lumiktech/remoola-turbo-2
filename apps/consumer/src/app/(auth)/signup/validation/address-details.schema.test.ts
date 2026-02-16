import { addressDetailsSchema } from './address-details.schema';
import { getFieldErrors } from './field-errors';

const validBase = {
  postalCode: `10001`,
  country: `United States`,
  state: `New York`,
  city: `New York`,
  street: `123 Main St`,
};

describe(`addressDetailsSchema`, () => {
  describe(`valid data (all signup flows)`, () => {
    it(`passes with all valid address details`, () => {
      const result = addressDetailsSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });
  });

  describe(`required fields`, () => {
    it(`fails when postalCode is empty`, () => {
      const result = addressDetailsSchema.safeParse({ ...validBase, postalCode: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).postalCode).toBe(`Postal code is required`);
      }
    });

    it(`fails when country is empty`, () => {
      const result = addressDetailsSchema.safeParse({ ...validBase, country: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).country).toBe(`Country is required`);
      }
    });

    it(`fails when state is empty`, () => {
      const result = addressDetailsSchema.safeParse({ ...validBase, state: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).state).toBe(`State / Region is required`);
      }
    });

    it(`fails when city is empty`, () => {
      const result = addressDetailsSchema.safeParse({ ...validBase, city: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).city).toBe(`City is required`);
      }
    });

    it(`fails when street is empty`, () => {
      const result = addressDetailsSchema.safeParse({ ...validBase, street: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).street).toBe(`Street is required`);
      }
    });
  });
});
