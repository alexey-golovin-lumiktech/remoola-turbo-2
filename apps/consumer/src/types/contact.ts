/**
 * Consumer contact types. Re-exported from @remoola/api-types for backward compatibility.
 */
import {
  type TConsumerContact,
  type TConsumerContactAddress,
  type TConsumerContactDetails,
  type TConsumerContactDetailsDocument,
  type TConsumerContactDetailsPaymentRequest,
} from '@remoola/api-types';

export type ConsumerContactAddress = TConsumerContactAddress;
export type ConsumerContact = TConsumerContact;
export type ConsumerContactDetails = TConsumerContactDetails;
export type ConsumerPaymentRequest = TConsumerContactDetailsPaymentRequest;
export type ConsumerDocument = TConsumerContactDetailsDocument;
