import { getCountries } from 'react-phone-number-input/input';
import labels from 'react-phone-number-input/locale/en.json';

export type CountryOption = { value: string; label: string };

const countryOptions: CountryOption[] = getCountries().map((code) => ({
  value: (labels as Record<string, string>)[code] ?? code,
  label: (labels as Record<string, string>)[code] ?? code,
}));

const nameToCode = new Map<string, string>(
  getCountries().map((code) => [(labels as Record<string, string>)[code] ?? code, code]),
);

export function getCountryOptions(): CountryOption[] {
  return countryOptions;
}

export function getCountryCode(name: string): string | undefined {
  return nameToCode.get(name);
}
