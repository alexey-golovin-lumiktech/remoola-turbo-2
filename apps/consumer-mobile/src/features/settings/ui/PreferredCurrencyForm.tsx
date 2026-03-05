'use client';

import { useActionState, useState, startTransition } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODES } from '@remoola/api-types';

import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { updatePreferredCurrencyAction } from '../actions';

interface PreferredCurrencyFormProps {
  initialCurrency: string | null;
}

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}));

export function PreferredCurrencyForm({ initialCurrency }: PreferredCurrencyFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency ?? `USD`);

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    const result = await updatePreferredCurrencyAction(formData);

    if (!result.ok) {
      toast.error(result.error.message);
      return result;
    }

    toast.success(`Preferred currency updated`);
    if (result.data.preferredCurrency) {
      setSelectedCurrency(result.data.preferredCurrency);
    }
    return result;
  }, null);

  return (
    <FormCard
      title="Preferred Currency"
      description="Default currency for new payment requests and forms. Display only; server validates amounts."
    >
      <form action={formAction} className="space-y-4">
        <FormField label="Currency" htmlFor="preferredCurrency">
          <FormSelect
            id="preferredCurrency"
            name="preferredCurrency"
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            placeholder="USD"
            disabled={isPending}
            onChange={(e) => {
              const newValue = e.currentTarget.value;
              setSelectedCurrency(newValue);
              const form = e.currentTarget.form;
              if (form) {
                const formData = new FormData(form);
                startTransition(() => {
                  formAction(formData);
                });
              }
            }}
          />
        </FormField>

        {isPending && (
          <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
            Updating currency...
          </p>
        )}
      </form>
    </FormCard>
  );
}
