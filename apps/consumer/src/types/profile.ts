/**
 * Shape of /api/profile/me response. Matches API response; do not import Prisma in consumer app.
 */

export type ConsumerProfilePersonalDetails = {
  firstName?: string | null;
  lastName?: string | null;
  citizenOf?: string | null;
  passportOrIdNumber?: string | null;
  legalStatus?: string | null;
  dateOfBirth?: string | null;
  countryOfTaxResidence?: string | null;
  taxId?: string | null;
  phoneNumber?: string | null;
};

export type ConsumerProfileAddressDetails = {
  postalCode?: string | null;
  country?: string | null;
  city?: string | null;
  street?: string | null;
  state?: string | null;
};

export type ConsumerProfileOrganizationDetails = {
  name?: string | null;
  consumerRole?: string | null;
  consumerRoleOther?: string | null;
  size?: string | null;
};

export type ConsumerProfile = {
  id: string;
  accountType: string;
  personalDetails?: ConsumerProfilePersonalDetails | null;
  addressDetails?: ConsumerProfileAddressDetails | null;
  organizationDetails?: ConsumerProfileOrganizationDetails | null;
};
