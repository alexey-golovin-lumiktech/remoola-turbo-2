import { type AddressDetails } from './types';
import { type ParsedAddress } from './utils/parseAddressFromString';

export function getAssistiveAddressPrefill(
  currentAddress: AddressDetails,
  parsedAddress: Partial<ParsedAddress>,
): Partial<AddressDetails> {
  const updates: Partial<AddressDetails> = {};

  if (!currentAddress.street.trim() && parsedAddress.street) updates.street = parsedAddress.street;
  if (!currentAddress.postalCode.trim() && parsedAddress.postalCode) updates.postalCode = parsedAddress.postalCode;
  if (!currentAddress.country.trim() && parsedAddress.country) updates.country = parsedAddress.country;
  if (!currentAddress.state.trim() && parsedAddress.state) updates.state = parsedAddress.state;
  if (!currentAddress.city.trim() && parsedAddress.city) updates.city = parsedAddress.city;

  return updates;
}
