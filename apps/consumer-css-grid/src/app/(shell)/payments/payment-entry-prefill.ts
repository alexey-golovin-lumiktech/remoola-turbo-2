const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

export function parsePaymentEntryPrefillEmail(value: string | string[] | undefined) {
  const normalized = getSingleValue(value).trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : ``;
}
