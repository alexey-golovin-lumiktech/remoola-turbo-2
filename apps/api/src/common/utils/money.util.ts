import { type IRateUnit, RateUnit } from '../types';

export const money = (cents: number, unit: IRateUnit) => {
  return `$${(cents / 100).toFixed(2)}/${unit == RateUnit.HOURLY ? `hr` : `fixed`}`;
};
