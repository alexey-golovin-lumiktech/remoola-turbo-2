/**
 * Consumer settings (display/UX only). Fintech-safe: preferred currency
 * is used only as UI default for amount fields; never for pricing or compliance.
 */

/** Currencies allowed for preferred-currency. Must match server allowlist. */
export const ALLOWED_PREFERRED_CURRENCIES = [`USD`, `EUR`, `GBP`, `JPY`, `AUD`] as const;
export type TPreferredCurrency = (typeof ALLOWED_PREFERRED_CURRENCIES)[number];

export interface ConsumerSettingsResponse {
  theme: string | null;
  preferredCurrency: TPreferredCurrency | null;
}

/** Partial update; only provided fields are applied. */
export interface UpdateConsumerSettingsPayload {
  theme?: string;
  preferredCurrency?: TPreferredCurrency;
}
