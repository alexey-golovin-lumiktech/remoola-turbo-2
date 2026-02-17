import { ConsumerRoles, OrganizationSizes } from '@remoola/api-types';

import { getFieldErrors } from './field-errors';
import { organizationSchema } from './organization-details.schema';

const validBase = {
  name: `Acme Corp`,
  consumerRole: ConsumerRoles.FOUNDER,
  size: OrganizationSizes.SMALL,
};

describe(`organizationSchema`, () => {
  describe(`Business / Contractor Entity - valid data`, () => {
    it(`passes with all valid organization details`, () => {
      const result = organizationSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it(`passes with different consumer roles`, () => {
      const roles = [ConsumerRoles.FINANCE, ConsumerRoles.LEGAL, ConsumerRoles.ENGINEERING];
      for (const role of roles) {
        const result = organizationSchema.safeParse({ ...validBase, consumerRole: role });
        expect(result.success).toBe(true);
      }
    });

    it(`passes with different organization sizes`, () => {
      const sizes = [OrganizationSizes.MEDIUM, OrganizationSizes.LARGE];
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
