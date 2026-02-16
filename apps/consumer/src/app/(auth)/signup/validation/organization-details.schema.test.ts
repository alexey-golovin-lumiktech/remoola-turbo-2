import { getFieldErrors } from './field-errors';
import { organizationSchema } from './organization-details.schema';
import { CONSUMER_ROLE, ORGANIZATION_SIZE } from '../../../../types';

const validBase = {
  name: `Acme Corp`,
  consumerRole: CONSUMER_ROLE.FOUNDER,
  size: ORGANIZATION_SIZE.SMALL,
};

describe(`organizationSchema`, () => {
  describe(`Business / Contractor Entity - valid data`, () => {
    it(`passes with all valid organization details`, () => {
      const result = organizationSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it(`passes with different consumer roles`, () => {
      const roles = [CONSUMER_ROLE.FINANCE, CONSUMER_ROLE.LEGAL, CONSUMER_ROLE.ENGINEERING];
      for (const role of roles) {
        const result = organizationSchema.safeParse({ ...validBase, consumerRole: role });
        expect(result.success).toBe(true);
      }
    });

    it(`passes with different organization sizes`, () => {
      const sizes = [ORGANIZATION_SIZE.MEDIUM, ORGANIZATION_SIZE.LARGE];
      for (const size of sizes) {
        const result = organizationSchema.safeParse({ ...validBase, size });
        expect(result.success).toBe(true);
      }
    });
  });

  describe(`required fields`, () => {
    it(`fails when name is empty`, () => {
      const result = organizationSchema.safeParse({ ...validBase, name: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).name).toBe(`Organization name is required`);
      }
    });

    it(`fails when consumerRole is empty`, () => {
      const result = organizationSchema.safeParse({ ...validBase, consumerRole: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).consumerRole).toBe(`Role in the organization is required`);
      }
    });

    it(`fails when size is empty`, () => {
      const result = organizationSchema.safeParse({ ...validBase, size: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).size).toBe(`Organization size is required`);
      }
    });
  });
});
