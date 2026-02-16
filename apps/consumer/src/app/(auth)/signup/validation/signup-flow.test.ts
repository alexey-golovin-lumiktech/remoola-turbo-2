/**
 * Integration tests for signup validation flow across all account types.
 * Mimics the validation logic in useSignupSubmit.
 */
import {
  addressDetailsSchema,
  entityDetailsSchema,
  organizationSchema,
  personalDetailsSchema,
  signupDetailsSchema,
} from './index';
import { ACCOUNT_TYPE, CONTRACTOR_KIND, CONSUMER_ROLE, LEGAL_STATUS, ORGANIZATION_SIZE } from '../../../../types';

type SignupDetailsBase = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: typeof ACCOUNT_TYPE.BUSINESS | typeof ACCOUNT_TYPE.CONTRACTOR;
  contractorKind: typeof CONTRACTOR_KIND.INDIVIDUAL | typeof CONTRACTOR_KIND.ENTITY | null;
  howDidHearAboutUs: null;
  howDidHearAboutUsOther: null;
};

const validSignupDetails: SignupDetailsBase = {
  email: `test@example.com`,
  password: `password123`,
  confirmPassword: `password123`,
  accountType: ACCOUNT_TYPE.BUSINESS,
  contractorKind: null,
  howDidHearAboutUs: null,
  howDidHearAboutUsOther: null,
};

const validAddressDetails = {
  postalCode: `10001`,
  country: `United States`,
  state: `New York`,
  city: `New York`,
  street: `123 Main St`,
};

const validPersonalDetails = {
  firstName: `John`,
  lastName: `Doe`,
  citizenOf: `United States`,
  countryOfTaxResidence: `United States`,
  legalStatus: LEGAL_STATUS.INDIVIDUAL,
  taxId: `123-45-6789`,
  dateOfBirth: `1990-01-15`,
  passportOrIdNumber: `AB1234567`,
  phoneNumber: `+12025551234`,
};

const validOrganizationDetails = {
  name: `Acme Corp`,
  consumerRole: CONSUMER_ROLE.FOUNDER,
  size: ORGANIZATION_SIZE.SMALL,
  consumerRoleOther: null,
};

function validateBusinessSignup(data: {
  signupDetails: SignupDetailsBase;
  personalDetails: typeof validPersonalDetails;
  organizationDetails: typeof validOrganizationDetails;
  addressDetails: typeof validAddressDetails;
}) {
  const signupResult = signupDetailsSchema.safeParse(data.signupDetails);
  if (!signupResult.success) return { valid: false, step: `signup` };

  const entityData = {
    companyName: data.organizationDetails.name,
    countryOfTaxResidence: data.personalDetails.countryOfTaxResidence,
    taxId: data.personalDetails.taxId,
    phoneNumber: data.personalDetails.phoneNumber,
    legalAddress: data.addressDetails.street,
  };
  const entityResult = entityDetailsSchema.safeParse(entityData);
  if (!entityResult.success) return { valid: false, step: `entity` };

  const orgResult = organizationSchema.safeParse(data.organizationDetails);
  if (!orgResult.success) return { valid: false, step: `organization` };

  const addressResult = addressDetailsSchema.safeParse(data.addressDetails);
  if (!addressResult.success) return { valid: false, step: `address` };

  return { valid: true };
}

function validateContractorIndividualSignup(data: {
  signupDetails: SignupDetailsBase;
  personalDetails: typeof validPersonalDetails;
  addressDetails: typeof validAddressDetails;
}) {
  const signupResult = signupDetailsSchema.safeParse(data.signupDetails);
  if (!signupResult.success) return { valid: false, step: `signup` };

  const personalResult = personalDetailsSchema.safeParse(data.personalDetails);
  if (!personalResult.success) return { valid: false, step: `personal` };

  const addressResult = addressDetailsSchema.safeParse(data.addressDetails);
  if (!addressResult.success) return { valid: false, step: `address` };

  return { valid: true };
}

function validateContractorEntitySignup(data: {
  signupDetails: SignupDetailsBase;
  personalDetails: typeof validPersonalDetails;
  organizationDetails: typeof validOrganizationDetails;
  addressDetails: typeof validAddressDetails;
}) {
  return validateBusinessSignup({
    ...data,
    signupDetails: { ...data.signupDetails, accountType: ACCOUNT_TYPE.CONTRACTOR } as SignupDetailsBase,
  });
}

describe(`signup flow validation`, () => {
  describe(`Business flow`, () => {
    it(`passes when all entity, organization, and address data is valid`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(true);
    });

    it(`fails when entity data is invalid (missing legalAddress)`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, street: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });

    it(`fails when address data is invalid`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, country: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });
  });

  describe(`Contractor Individual flow`, () => {
    it(`passes when all personal and address data is valid`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: ACCOUNT_TYPE.CONTRACTOR,
          contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        },
        personalDetails: validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(true);
    });

    it(`fails when personal data is invalid (missing legalStatus)`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: ACCOUNT_TYPE.CONTRACTOR,
          contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        },
        personalDetails: { ...validPersonalDetails, legalStatus: `` } as unknown as typeof validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`personal`);
    });

    it(`fails when address data is invalid`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: ACCOUNT_TYPE.CONTRACTOR,
          contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
        },
        personalDetails: validPersonalDetails,
        addressDetails: { ...validAddressDetails, state: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });
  });

  describe(`Contractor Entity flow`, () => {
    it(`passes when all entity, organization, and address data is valid`, () => {
      const result = validateContractorEntitySignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: ACCOUNT_TYPE.CONTRACTOR,
          contractorKind: CONTRACTOR_KIND.ENTITY,
        },
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(true);
    });

    it(`fails when entity data is invalid`, () => {
      const result = validateContractorEntitySignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: ACCOUNT_TYPE.CONTRACTOR,
          contractorKind: CONTRACTOR_KIND.ENTITY,
        },
        personalDetails: { ...validPersonalDetails, taxId: `` },
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });
  });
});
