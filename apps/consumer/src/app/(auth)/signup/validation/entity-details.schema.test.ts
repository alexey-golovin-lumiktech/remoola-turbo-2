import { entityDetailsSchema } from './entity-details.schema';
import { getFieldErrors } from './field-errors';

const validBase = {
  companyName: `Acme Corp`,
  countryOfTaxResidence: `United States`,
  taxId: `12-3456789`,
  phoneNumber: `+12025551234`,
  legalAddress: `123 Main St, New York, NY 10001`,
};

describe(`entityDetailsSchema`, () => {
  describe(`Business / Contractor Entity - valid data`, () => {
    it(`passes with all valid entity details`, () => {
      const result = entityDetailsSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });
  });

  describe(`required fields`, () => {
    it(`fails when companyName is empty`, () => {
      const result = entityDetailsSchema.safeParse({ ...validBase, companyName: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).companyName).toBe(`Company name is required`);
      }
    });

    it(`fails when countryOfTaxResidence is empty`, () => {
      const result = entityDetailsSchema.safeParse({ ...validBase, countryOfTaxResidence: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).countryOfTaxResidence).toBe(`Country of tax residence is required`);
      }
    });

    it(`fails when taxId is empty`, () => {
      const result = entityDetailsSchema.safeParse({ ...validBase, taxId: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).taxId).toBe(`Tax ID is required`);
      }
    });

    it(`fails when phoneNumber is empty`, () => {
      const result = entityDetailsSchema.safeParse({ ...validBase, phoneNumber: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).phoneNumber).toBe(`Phone number is required`);
      }
    });

    it(`fails when legalAddress is empty`, () => {
      const result = entityDetailsSchema.safeParse({ ...validBase, legalAddress: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).legalAddress).toBe(`Legal address is required`);
      }
    });
  });
});
