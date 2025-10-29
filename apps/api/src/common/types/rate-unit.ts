export const RateUnit = {
  HOURLY: `hour`,
  FIXED: `fixed`,
} as const;
export const RateUnits = Object.values(RateUnit);
export type IRateUnit = (typeof RateUnit)[keyof typeof RateUnit];
