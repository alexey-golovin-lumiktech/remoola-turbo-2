export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ParseAddressOptions = {
  countryHint?: string | null;
};

const STATE_POSTAL_PATTERN = /^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?|[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)$/;
const US_POSTAL_PATTERN = /^\d{5}(?:-\d{4})?$/;
const CANADA_POSTAL_PATTERN = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const UK_POSTAL_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const RUSSIA_POSTAL_PATTERN = /^\d{6}$/;
const GERMANY_CITY_POSTAL_PATTERN = /^(\d{5})\s+(.+)$/;

const SUPPORTED_COUNTRIES = {
  unitedStates: `United States`,
  canada: `Canada`,
  unitedKingdom: `United Kingdom`,
  russia: `Russia`,
  germany: `Germany`,
} as const;

type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[keyof typeof SUPPORTED_COUNTRIES];
type NorthAmericaCountry = typeof SUPPORTED_COUNTRIES.unitedStates | typeof SUPPORTED_COUNTRIES.canada;
type ParseAttempt = { matched: true; value: Partial<ParsedAddress> } | { matched: false };

function normalizeCountryValue(country: string | null | undefined): SupportedCountry | undefined {
  const normalized = country?.trim().toLowerCase();
  if (!normalized) return undefined;
  if ([`united states`, `united states of america`, `usa`, `us`].includes(normalized)) {
    return SUPPORTED_COUNTRIES.unitedStates;
  }
  if ([`canada`, `ca`].includes(normalized)) {
    return SUPPORTED_COUNTRIES.canada;
  }
  if ([`united kingdom`, `uk`, `great britain`, `britain`].includes(normalized)) {
    return SUPPORTED_COUNTRIES.unitedKingdom;
  }
  if ([`russia`, `russian federation`].includes(normalized)) {
    return SUPPORTED_COUNTRIES.russia;
  }
  if ([`germany`, `deutschland`].includes(normalized)) {
    return SUPPORTED_COUNTRIES.germany;
  }
  return undefined;
}

function getSupportedCountryTail(parts: string[]): SupportedCountry | undefined {
  return normalizeCountryValue(parts.at(-1));
}

function isNorthAmericaCountry(country: string | undefined): country is NorthAmericaCountry {
  return country === SUPPORTED_COUNTRIES.unitedStates || country === SUPPORTED_COUNTRIES.canada;
}

function inferCountryFromPostalCode(postalCode: string): string | undefined {
  const normalized = postalCode.trim().toUpperCase();
  if (US_POSTAL_PATTERN.test(normalized)) return SUPPORTED_COUNTRIES.unitedStates;
  if (CANADA_POSTAL_PATTERN.test(normalized)) return SUPPORTED_COUNTRIES.canada;
  return undefined;
}

function buildSafeFallback(
  fullAddress: string,
  countryHint?: SupportedCountry,
  explicitCountry?: SupportedCountry,
): Partial<ParsedAddress> {
  const trimmed = fullAddress.trim();
  if (!trimmed) return {};
  return {
    street: trimmed,
    ...(explicitCountry ? { country: explicitCountry } : countryHint ? { country: countryHint } : {}),
  };
}

function parseUnitedStatesOrCanada(
  parts: string[],
  countryHint?: SupportedCountry,
  explicitCountry?: SupportedCountry,
): ParseAttempt {
  const countryFromTail =
    explicitCountry && inferCountryFromPostalCode(parts.at(-2) ?? ``) ? explicitCountry : undefined;
  const candidateCountry = countryHint ?? countryFromTail;
  if (candidateCountry && !isNorthAmericaCountry(candidateCountry)) {
    return { matched: false };
  }

  const withoutCountry = explicitCountry && isNorthAmericaCountry(explicitCountry) ? parts.slice(0, -1) : parts;
  if (withoutCountry.length < 2) return { matched: false };

  const last = withoutCountry.at(-1);
  const match = last?.match(STATE_POSTAL_PATTERN);
  if (!match) return { matched: false };

  const inferredCountry = inferCountryFromPostalCode(match[2]!);
  const resolvedCountry = candidateCountry ?? inferredCountry;
  if (!resolvedCountry || !isNorthAmericaCountry(resolvedCountry)) {
    return { matched: false };
  }

  const city = withoutCountry.at(-2);
  const street = withoutCountry.slice(0, -2).join(`, `);
  if (!city || !street) return { matched: false };

  return {
    matched: true,
    value: {
      street,
      city,
      state: match[1]!.toUpperCase(),
      postalCode: match[2]!.toUpperCase(),
      country: resolvedCountry,
    },
  };
}

function parseUnitedKingdom(
  parts: string[],
  countryHint?: SupportedCountry,
  explicitCountry?: SupportedCountry,
): ParseAttempt {
  const resolvedCountry = explicitCountry ?? countryHint;
  if (resolvedCountry !== SUPPORTED_COUNTRIES.unitedKingdom) return { matched: false };

  const withoutCountry = explicitCountry === SUPPORTED_COUNTRIES.unitedKingdom ? parts.slice(0, -1) : parts;
  if (withoutCountry.length < 3) return { matched: false };

  const postcode = withoutCountry.at(-1)?.trim().toUpperCase();
  if (!postcode || !UK_POSTAL_PATTERN.test(postcode)) return { matched: false };

  const city = withoutCountry.at(-2);
  const street = withoutCountry.slice(0, -2).join(`, `);
  if (!city || !street) return { matched: false };

  return {
    matched: true,
    value: {
      street,
      city,
      postalCode: postcode,
      country: SUPPORTED_COUNTRIES.unitedKingdom,
    },
  };
}

function parseRussia(
  parts: string[],
  countryHint?: SupportedCountry,
  explicitCountry?: SupportedCountry,
): ParseAttempt {
  const resolvedCountry = explicitCountry ?? countryHint;
  if (resolvedCountry !== SUPPORTED_COUNTRIES.russia) return { matched: false };

  const withoutCountry = explicitCountry === SUPPORTED_COUNTRIES.russia ? parts.slice(0, -1) : parts;
  if (withoutCountry.length < 3) return { matched: false };

  const postalCode = withoutCountry.at(-1)?.trim();
  if (!postalCode || !RUSSIA_POSTAL_PATTERN.test(postalCode)) return { matched: false };

  const cityIndex = withoutCountry.length >= 4 ? withoutCountry.length - 3 : withoutCountry.length - 2;
  const city = withoutCountry[cityIndex];
  const state = withoutCountry.length >= 4 ? withoutCountry[cityIndex + 1] : undefined;
  const street = withoutCountry.slice(0, cityIndex).join(`, `);
  if (!city || !street) return { matched: false };

  return {
    matched: true,
    value: {
      street,
      city,
      ...(state ? { state } : {}),
      postalCode,
      country: SUPPORTED_COUNTRIES.russia,
    },
  };
}

function parseGermany(
  parts: string[],
  countryHint?: SupportedCountry,
  explicitCountry?: SupportedCountry,
): ParseAttempt {
  const resolvedCountry = explicitCountry ?? countryHint;
  if (resolvedCountry !== SUPPORTED_COUNTRIES.germany) return { matched: false };

  const withoutCountry = explicitCountry === SUPPORTED_COUNTRIES.germany ? parts.slice(0, -1) : parts;
  if (withoutCountry.length < 2) return { matched: false };

  const cityPostalSegment = withoutCountry.at(-1)?.trim();
  const match = cityPostalSegment?.match(GERMANY_CITY_POSTAL_PATTERN);
  if (!match) return { matched: false };

  const street = withoutCountry.slice(0, -1).join(`, `);
  if (!street) return { matched: false };

  return {
    matched: true,
    value: {
      street,
      postalCode: match[1]!,
      city: match[2]!,
      country: SUPPORTED_COUNTRIES.germany,
    },
  };
}

function parseGenericAddress(parts: string[]): Partial<ParsedAddress> {
  const result: Partial<ParsedAddress> = {};
  let consumedCount = 0;

  const last = parts.at(-1)!;
  const lastStatePostalMatch = last.match(STATE_POSTAL_PATTERN);
  if (lastStatePostalMatch) {
    result.state = lastStatePostalMatch[1]!.toUpperCase();
    result.postalCode = lastStatePostalMatch[2]!.toUpperCase();
    result.country = inferCountryFromPostalCode(result.postalCode) ?? result.country;
    consumedCount += 1;
  } else if (last && !/^\d+/.test(last) && last.length > 2) {
    result.country = normalizeCountryValue(last) ?? last;
    consumedCount += 1;
  }

  const secondLast = parts[parts.length - 1 - consumedCount];
  const secondStatePostalMatch = !result.state && secondLast?.match(STATE_POSTAL_PATTERN);
  if (secondStatePostalMatch) {
    result.state = secondStatePostalMatch[1]!.toUpperCase();
    result.postalCode = secondStatePostalMatch[2]!.toUpperCase();
    result.country = inferCountryFromPostalCode(result.postalCode) ?? result.country;
    consumedCount += 1;
  }

  if (parts.length > consumedCount + 1) {
    result.city = parts[parts.length - 1 - consumedCount]!;
    consumedCount += 1;
  }

  const streetEnd = parts.length - consumedCount;
  if (streetEnd > 0) {
    result.street = parts.slice(0, streetEnd).join(`, `);
  }

  return result;
}

export function parseAddressFromString(fullAddress: string, options: ParseAddressOptions = {}): Partial<ParsedAddress> {
  const trimmed = fullAddress.trim();
  if (!trimmed) return {};

  const parts = trimmed
    .split(`,`)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return { street: trimmed };
  }

  const countryHint = normalizeCountryValue(options.countryHint);
  const explicitCountry = getSupportedCountryTail(parts);
  const targetCountry = countryHint ?? explicitCountry;

  if (targetCountry) {
    const attempts: ParseAttempt[] = [
      parseUnitedStatesOrCanada(parts, targetCountry, explicitCountry),
      parseUnitedKingdom(parts, targetCountry, explicitCountry),
      parseRussia(parts, targetCountry, explicitCountry),
      parseGermany(parts, targetCountry, explicitCountry),
    ];
    const matched = attempts.find((attempt) => attempt.matched);
    if (matched?.matched) {
      return matched.value;
    }
    return buildSafeFallback(trimmed, countryHint, explicitCountry);
  }

  return parseGenericAddress(parts);
}
