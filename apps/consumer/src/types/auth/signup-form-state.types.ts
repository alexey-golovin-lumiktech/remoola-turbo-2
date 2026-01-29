import { type IAddressDetails } from './address-details.types';
import { type IOrganizationDetails } from './organization-details.types';
import { type IPersonalDetails } from './personal-details.types';
import { type ISignupDetails } from './signup-details.types';

export type ISignupFormState = {
  signupDetails: ISignupDetails;
  personalDetails: IPersonalDetails;
  organizationDetails: IOrganizationDetails;
  addressDetails: IAddressDetails;
};
