/** Strict checks for JS undefined/null only. Do not treat string "null"/"undefined" as nil (fintech-safe). */
export const isUndefined = (value: unknown): value is undefined => value === undefined;
export const isNull = (value: unknown): value is null => value === null;
export const isNill = (value: unknown): value is null | undefined => value == null;
export const isDateObject = (value: unknown) => value instanceof Date;

/**
 * @DESCRIPTION to reduce data size through excluding `null` and `undefined` attributes
 * @IMPORTANT Prefer use **only** for outgoing data (e.g. responses or any data you send out).
 * For incoming data: do not use where you need to distinguish "field omitted" vs "field set to null".
 * Exception: auth/signup request bodies where optional
 * fields are not explicitly set to null — use is acceptable to normalize before service layer.
 *
 * We distinguish three attribute states:
 * 1. `undefined` — the attribute was not provided; do not apply it in processing.
 * 2. `null`      — the attribute was explicitly set to null; update the value to null.
 * 3. `<value>`   — the attribute was explicitly set to a non-null value; update accordingly.
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
