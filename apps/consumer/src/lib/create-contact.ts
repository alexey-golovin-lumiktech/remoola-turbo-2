import { type IAddressDetails } from '../types';

export type CreateContactInput = {
  email: string | null;
  name: string | null;
  address: IAddressDetails;
};

function normalizeNullable(value: string | null): string | null {
  return value?.trim() ?? null;
}

export function toCreateContactPayload(input: CreateContactInput) {
  return {
    email: normalizeNullable(input.email),
    name: normalizeNullable(input.name),
    address: {
      postalCode: normalizeNullable(input.address.postalCode),
      country: normalizeNullable(input.address.country),
      state: normalizeNullable(input.address.state),
      city: normalizeNullable(input.address.city),
      street: normalizeNullable(input.address.street),
    },
  };
}

export async function createContactRequest(input: CreateContactInput): Promise<Response> {
  return fetch(`/api/contacts`, {
    method: `POST`,
    headers: { 'content-type': `application/json` },
    body: JSON.stringify(toCreateContactPayload(input)),
    credentials: `include`,
  });
}
