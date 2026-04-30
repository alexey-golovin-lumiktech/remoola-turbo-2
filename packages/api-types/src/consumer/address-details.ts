/** Fields can be null while the form is still partially filled. */

export type TAddressDetails = {
  postalCode: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
};
