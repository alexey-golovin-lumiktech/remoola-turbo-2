import { type TAddressDetails } from './address-details';
import { type ConsumerCreateContactPayload } from './mutations';
import {
  type ConsumerContactAddressResponse,
  type ConsumerContactDetailsResponse,
  type ConsumerContactResponse,
  type ConsumerContactsResponse,
} from './responses';

export type TConsumerContactAddress = NonNullable<ConsumerContactAddressResponse>;
export type TConsumerContact = ConsumerContactResponse;
export type TConsumerContactDetailsPaymentRequest = ConsumerContactDetailsResponse[`paymentRequests`][number];
export type TConsumerContactDetailsDocument = ConsumerContactDetailsResponse[`documents`][number];
export type TConsumerContactDetails = ConsumerContactDetailsResponse;
export type TConsumerContactsResponse = ConsumerContactsResponse;

/** Create payload: address uses TAddressDetails for form-friendly nullables. */
export type TConsumerCreateContactPayload = Omit<ConsumerCreateContactPayload, `address`> & {
  address?: TAddressDetails;
};
