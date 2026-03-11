import { getCountries } from 'react-phone-number-input/input';
import labels from 'react-phone-number-input/locale/en.json';

export type CountryOption = { value: string; label: string };

/** All countries as options for select: label is country name, value is country name (for form compatibility) */
const countryOptions: CountryOption[] = getCountries().map((code) => ({
  value: (labels as Record<string, string>)[code] ?? code,
  label: (labels as Record<string, string>)[code] ?? code,
}));

/** Country name -> ISO 2-letter code for phone default country */
const nameToCode = new Map<string, string>(
  getCountries().map((code) => [(labels as Record<string, string>)[code] ?? code, code]),
);

export function getCountryOptions(): CountryOption[] {
  return countryOptions;
}

/** Resolve country name to ISO code (e.g. "Russia" -> "RU") for defaultCountry prop */
export function getCountryCode(name: string): string | undefined {
  return nameToCode.get(name);
}
