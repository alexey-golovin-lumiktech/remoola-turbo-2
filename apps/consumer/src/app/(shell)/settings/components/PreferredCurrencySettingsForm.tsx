'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { FormSelect, type FormSelectOption } from '../../../../components/ui';
import styles from '../../../../components/ui/classNames.module.css';

const { themeCard, themeDescription, themeTitle, themeUpdating } = styles;

const CURRENCY_OPTIONS: FormSelectOption[] = CURRENCY_CODES.map((c) => ({
  value: c,
  label: c,
}));

interface PreferredCurrencySettingsFormProps {
  preferredCurrency: TCurrencyCode | null;
  onUpdated: (value: TCurrencyCode | null) => void;
}

export function PreferredCurrencySettingsForm({ preferredCurrency, onUpdated }: PreferredCurrencySettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const value = preferredCurrency ?? ``;

  async function handleChange(currency: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/settings`, {
        method: `PATCH`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ preferredCurrency: currency }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to update`);
      }

      const data = (await response.json()) as { preferredCurrency: TCurrencyCode | null };
      onUpdated(data.preferredCurrency);
      toast.success(`Preferred currency updated`);
    } catch (error) {
      toast.error(`We couldn't update your preferred currency. Please try again.`);
      console.error(`Preferred currency update error:`, error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={themeCard}>
      <h3 className={themeTitle}>Preferred currency</h3>
      <p className={themeDescription}>
        Default currency for new payment requests and start-payment forms. Display only; actual amounts are always
        validated by the server.
      </p>
      <FormSelect
        label=""
        value={value}
        onChange={(v) => handleChange(v ?? ``)}
        options={CURRENCY_OPTIONS}
        placeholder="USD"
        isClearable={false}
      />
      {loading && <div className={themeUpdating}>Updating...</div>}
    </div>
  );
}
