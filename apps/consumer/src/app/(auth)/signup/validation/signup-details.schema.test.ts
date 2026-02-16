import { getFieldErrors } from './field-errors';
import { createSignupDetailsSchema, signupDetailsSchema } from './signup-details.schema';
import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../../../types';

const validBase = {
  email: `test@example.com`,
  password: `password123`,
  confirmPassword: `password123`,
};

describe(`signupDetailsSchema`, () => {
  describe(`account type and contractor kind`, () => {
    it(`passes when Business selected with contractorKind null`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when Business selected with contractorKind set (must be null)`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.contractorKind).toBe(`Choose a contractor kind`);
      }
    });

    it(`passes when Contractor selected with Individual`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(true);
    });

    it(`passes when Contractor selected with Entity`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: CONTRACTOR_KIND.ENTITY,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when Contractor selected with contractorKind null`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.contractorKind).toBe(`Choose a contractor kind`);
      }
    });
  });

  describe(`email`, () => {
    it(`fails when email is empty`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        email: ``,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.email).toBeDefined();
      }
    });

    it(`fails when email is invalid`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        email: `not-an-email`,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.email).toBe(`Enter a valid email address`);
      }
    });
  });

  describe(`password`, () => {
    it(`fails when password is too short`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        password: `short`,
        confirmPassword: `short`,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.password).toBeDefined();
      }
    });

    it(`fails when passwords do not match`, () => {
      const result = signupDetailsSchema.safeParse({
        ...validBase,
        password: `password123`,
        confirmPassword: `different456`,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        expect(errors.confirmPassword).toBe(`Passwords do not match`);
      }
    });
  });

  describe(`Google signup (createSignupDetailsSchema(true))`, () => {
    const googleSchema = createSignupDetailsSchema(true);

    it(`passes when email and account type valid, password/confirmPassword omitted`, () => {
      const result = googleSchema.safeParse({
        email: `user@gmail.com`,
        password: undefined,
        confirmPassword: undefined,
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(true);
    });

    it(`passes when email and account type valid, password/confirmPassword empty string`, () => {
      const result = googleSchema.safeParse({
        email: `user@gmail.com`,
        password: ``,
        confirmPassword: ``,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(true);
    });

    it(`still requires valid email`, () => {
      const result = googleSchema.safeParse({
        email: `invalid`,
        password: undefined,
        confirmPassword: undefined,
        accountType: ACCOUNT_TYPE.BUSINESS,
        contractorKind: null,
        howDidHearAboutUs: null,
        howDidHearAboutUsOther: null,
      });
      expect(result.success).toBe(false);
    });
  });
});
