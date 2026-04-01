/**
 * Consumer settings (display/UX only). Fintech-safe: preferred currency
 * is used only as UI default for amount fields; never for pricing or compliance.
 */

import { type TCurrencyCode } from '../currency';
import { type TTheme } from './theme';

export interface ConsumerSettingsResponse {
  theme: TTheme | null;
  preferredCurrency: TCurrencyCode | null;
}

/** Partial update; only provided fields are applied. */
export interface UpdateConsumerSettingsPayload {
  theme?: TTheme;
  preferredCurrency?: TCurrencyCode;
}
