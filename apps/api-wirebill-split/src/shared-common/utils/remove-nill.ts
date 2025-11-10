export const isUndefined = (value: unknown) => /undefined/gi.test(String(value).toLowerCase());
export const isNull = (value: unknown) => /null/gi.test(String(value).toLowerCase());
export const isNill = (value: unknown) => isNull(value) || isUndefined(value);
export const isDateObject = (value: unknown) => value instanceof Date;

/**
 * @DESCRIPTION to reduce data size through excluding `null` and `undefined` attributes
 * @IMPORTANT Use this decorator **only** for outgoing data (e.g. responses or any data you send out).
 * @DO_NOT use it on incoming data.
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
    const obj = input as Record<string, any>;
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isNill(value)) continue;

      const cleanedValue = removeNil(value);
      if (!isUndefined(cleanedValue)) result[key] = cleanedValue;
    }

    return result as unknown as T;
  }

  return input;
};
