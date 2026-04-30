const isNull = (value: unknown): value is null => value === null;
const isNill = (value: unknown): value is null | undefined => value == null;
const isDateObject = (value: unknown) => value instanceof Date;

/**
 * Removes `null` and `undefined` recursively.
 * Avoid using this on input payloads when omitted fields and explicit `null` must remain distinct.
 */
export const removeNil = <T>(input: T): T => {
  if (Array.isArray(input)) {
    const cleaned = input.map((v) => removeNil(v)).filter((v) => !isNill(v));
    return cleaned as unknown as T;
  }

  if (!isNull(input) && typeof input === `object` && !isDateObject(input)) {
    const obj = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isNill(value)) continue;

      const cleanedValue = removeNil(value);
      if (!isNill(cleanedValue)) result[key] = cleanedValue;
    }

    return result as unknown as T;
  }

  return input;
};
