export function optionalStringQuery(value: unknown): unknown {
  if (typeof value !== `string`) return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalNumberQuery(value: unknown): unknown {
  if (typeof value === `number`) return value;
  if (typeof value !== `string`) return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? Number(trimmed) : undefined;
}

export function optionalDateQuery(value: unknown): unknown {
  if (value instanceof Date) return value;
  if (typeof value !== `string`) return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? new Date(trimmed) : undefined;
}

export function optionalBooleanQuery(value: unknown): unknown {
  if (value === true || value === false) return value;
  if (typeof value !== `string`) return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === `true`) return true;
  if (trimmed === `false`) return false;
  return value;
}
