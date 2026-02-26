/**
 * Address details shape for forms and API contract.
 * Form-friendly: fields can be null for partial input.
 */

export type TAddressDetails = {
  postalCode: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
};
