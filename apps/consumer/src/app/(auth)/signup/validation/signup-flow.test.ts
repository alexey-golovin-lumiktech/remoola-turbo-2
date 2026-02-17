/**
 * Integration tests for signup validation flow across all account types.
 * Mimics the validation logic in useSignupSubmit.
 */
import { ContractorKinds, AccountTypes, LegalStatuses, OrganizationSizes, ConsumerRoles } from '@remoola/api-types';

import {
  addressDetailsSchema,
  createSignupDetailsSchema,
  entityDetailsSchema,
  organizationSchema,
  personalDetailsSchema,
  signupDetailsSchema,
} from './index';

type SignupDetailsBase = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: typeof AccountTypes.BUSINESS | typeof AccountTypes.CONTRACTOR;
  contractorKind: typeof ContractorKinds.INDIVIDUAL | typeof ContractorKinds.ENTITY | null;
  howDidHearAboutUs: null;
  howDidHearAboutUsOther: null;
};

const validSignupDetails: SignupDetailsBase = {
  email: `test@example.com`,
  password: `password123`,
  confirmPassword: `password123`,
  accountType: AccountTypes.BUSINESS,
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
  legalStatus: LegalStatuses.INDIVIDUAL,
  taxId: `123-45-6789`,
  dateOfBirth: `1990-01-15`,
  passportOrIdNumber: `123456789`, // US format: 9 digits
  phoneNumber: `+12025551234`,
};

const validOrganizationDetails = {
  name: `Acme Corp`,
  consumerRole: ConsumerRoles.FOUNDER,
  size: OrganizationSizes.SMALL,
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

function validateContractorIndividualGoogleSignup(data: {
  signupDetails: Omit<SignupDetailsBase, `password` | `confirmPassword`> & {
    password?: string;
    confirmPassword?: string;
  };
  personalDetails: typeof validPersonalDetails;
  addressDetails: typeof validAddressDetails;
}) {
  const googleSchema = createSignupDetailsSchema(true);
  const signupResult = googleSchema.safeParse(data.signupDetails);
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
    signupDetails: { ...data.signupDetails, accountType: AccountTypes.CONTRACTOR } as SignupDetailsBase,
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
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
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
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
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
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: validPersonalDetails,
        addressDetails: { ...validAddressDetails, state: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });
  });

  describe(`Contractor Individual Google signup flow`, () => {
    const googleSignupDetails = {
      email: `user@gmail.com`,
      accountType: AccountTypes.CONTRACTOR,
      contractorKind: ContractorKinds.INDIVIDUAL,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
    };

    it(`passes when all data valid, password/confirmPassword omitted`, () => {
      const result = validateContractorIndividualGoogleSignup({
        signupDetails: googleSignupDetails,
        personalDetails: validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(true);
    });

    it(`fails when email invalid (Google schema still requires valid email)`, () => {
      const result = validateContractorIndividualGoogleSignup({
        signupDetails: { ...googleSignupDetails, email: `invalid` },
        personalDetails: validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });

    it(`fails when contractor kind missing`, () => {
      const result = validateContractorIndividualGoogleSignup({
        signupDetails: { ...googleSignupDetails, contractorKind: null },
        personalDetails: validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });
  });

  describe(`Contractor Entity flow`, () => {
    it(`passes when all entity, organization, and address data is valid`, () => {
      const result = validateContractorEntitySignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.ENTITY,
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
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.ENTITY,
        },
        personalDetails: { ...validPersonalDetails, taxId: `` },
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });
  });

  describe(`Signup details - incorrect values`, () => {
    it(`fails when email is invalid`, () => {
      const result = validateBusinessSignup({
        signupDetails: { ...validSignupDetails, email: `not-an-email` },
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });

    it(`fails when password is too short`, () => {
      const result = validateBusinessSignup({
        signupDetails: { ...validSignupDetails, password: `short`, confirmPassword: `short` },
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });

    it(`fails when passwords do not match`, () => {
      const result = validateBusinessSignup({
        signupDetails: {
          ...validSignupDetails,
          password: `password123`,
          confirmPassword: `different456`,
        },
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });

    it(`fails when contractor has no contractor kind selected`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: null,
        },
        personalDetails: validPersonalDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`signup`);
    });
  });

  describe(`Personal/Entity details - incorrect values`, () => {
    it(`fails when taxId is invalid format (too short)`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: { ...validPersonalDetails, taxId: `123` },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`personal`);
    });

    it(`fails when taxId contains invalid characters`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: { ...validPersonalDetails, taxId: `12#3456789` },
        organizationDetails: validOrganizationDetails,
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });

    it(`fails when phone number is invalid`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: { ...validPersonalDetails, phoneNumber: `invalid` },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`personal`);
    });
  });

  describe(`Address details - incorrect / missed values`, () => {
    it(`fails when postal code is empty`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, postalCode: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });

    it(`fails when street is empty`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, street: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });

    it(`fails when city is empty`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, city: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });
  });

  describe(`Organization details - missed values`, () => {
    it(`fails when organization name is empty (caught at entity step which uses it)`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: { ...validOrganizationDetails, name: `` },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`entity`);
    });

    it(`fails when consumer role is empty`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: { ...validOrganizationDetails, consumerRole: `` as typeof ConsumerRoles.FOUNDER },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`organization`);
    });

    it(`fails when organization size is empty`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: { ...validOrganizationDetails, size: `` as typeof OrganizationSizes.SMALL },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`organization`);
    });
  });

  describe(`Lost filling / partial data`, () => {
    it(`fails when personal details firstName is missing`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: { ...validPersonalDetails, firstName: `` },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`personal`);
    });

    it(`fails when personal details citizenOf is missing`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: { ...validPersonalDetails, citizenOf: `` },
        addressDetails: validAddressDetails,
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`personal`);
    });

    it(`fails when address country is missing`, () => {
      const result = validateContractorIndividualSignup({
        signupDetails: {
          ...validSignupDetails,
          accountType: AccountTypes.CONTRACTOR,
          contractorKind: ContractorKinds.INDIVIDUAL,
        },
        personalDetails: validPersonalDetails,
        addressDetails: { ...validAddressDetails, country: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });

    it(`fails when address state is missing`, () => {
      const result = validateBusinessSignup({
        signupDetails: validSignupDetails,
        personalDetails: validPersonalDetails,
        organizationDetails: validOrganizationDetails,
        addressDetails: { ...validAddressDetails, state: `` },
      });
      expect(result.valid).toBe(false);
      expect(result.step).toBe(`address`);
    });
  });
});
