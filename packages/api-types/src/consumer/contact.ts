/**
 * Consumer contact API contract types. Shared by consumer app and API responses.
 */

import { type TAddressDetails } from './address-details';

export type TConsumerContactAddress = {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
};

export type TConsumerContact = {
  id: string;
  email: string;
  name: string | null;
  address: TConsumerContactAddress;
};

export type TConsumerContactDetailsPaymentRequest = {
  id: string;
  amount: string;
  status: string;
  createdAt: Date;
};

export type TConsumerContactDetailsDocument = {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
};

export type TConsumerContactDetails = {
  id: string;
  email: string;
  name: string;
  address: TConsumerContactAddress;
  paymentRequests: TConsumerContactDetailsPaymentRequest[];
  documents: TConsumerContactDetailsDocument[];
};

export type TConsumerContactsResponse = {
  items: TConsumerContact[];
  total: number;
  page: number;
  pageSize: number;
};

/** Create payload: address uses TAddressDetails for form-friendly nullables. */
export type TConsumerCreateContactPayload = {
  email: string | null;
  name?: string | null;
  address?: TAddressDetails;
};
