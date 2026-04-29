/**
 * Boolean query parameter values for API filtering.
 * Used for optional boolean flags in query strings.
 */

const BOOLEAN_QUERY_VALUE = {
  true: `true`,
  false: `false`,
} as const;
export type TBooleanQueryValue = (typeof BOOLEAN_QUERY_VALUE)[keyof typeof BOOLEAN_QUERY_VALUE];
const BOOLEAN_QUERY_VALUES = [BOOLEAN_QUERY_VALUE.true, BOOLEAN_QUERY_VALUE.false] as const;
