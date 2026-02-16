/**
 * Parses a full address string (e.g. from Legal address) into components.
 * Handles common formats: "Street, City, State PostalCode, Country"
 */
export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

/** US/CA: 2-letter state + 5-digit zip, optionally 5+4 */
const STATE_POSTAL_PATTERN = /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/;

export function parseAddressFromString(fullAddress: string): Partial<ParsedAddress> {
  const trimmed = fullAddress.trim();
  if (!trimmed) return {};

  const parts = trimmed
    .split(`,`)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return { street: trimmed };
  }

  const result: Partial<ParsedAddress> = {};
  let consumedCount = 0;

  // Last part: try "State PostalCode" first (e.g. "IL 62704", "NY 10001"), else country
  const last = parts[parts.length - 1]!;
  const lastStatePostalMatch = last?.match(STATE_POSTAL_PATTERN);
  if (lastStatePostalMatch) {
    result.state = lastStatePostalMatch[1]!.toUpperCase();
    result.postalCode = lastStatePostalMatch[2]!;
    consumedCount += 1;
  } else if (last && !/^\d+/.test(last) && last.length > 2) {
    result.country = last;
    consumedCount += 1;
  }

  // Part before last: "State PostalCode" if not already found
  const secondLast = parts[parts.length - 1 - consumedCount]!;
  const secondStatePostalMatch = !result.state && secondLast?.match(STATE_POSTAL_PATTERN);
  if (secondStatePostalMatch) {
    result.state = secondStatePostalMatch[1]!.toUpperCase();
    result.postalCode = secondStatePostalMatch[2]!;
    consumedCount += 1;
  }

  // City: part before state+postal (or before country if no state+postal)
  if (parts.length > consumedCount + 1) {
    result.city = parts[parts.length - 1 - consumedCount]!;
    consumedCount += 1;
  }

  // Street: all remaining parts from the start
  const streetEnd = parts.length - consumedCount;
  if (streetEnd > 0) {
    result.street = parts.slice(0, streetEnd).join(`, `);
  }

  return result;
}
