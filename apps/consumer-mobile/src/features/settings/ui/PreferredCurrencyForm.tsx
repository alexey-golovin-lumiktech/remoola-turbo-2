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
      <form action={formAction} className={`space-y-5`}>
        <FormField label="Currency" htmlFor="preferredCurrency">
          <FormSelect
            id="preferredCurrency"
            name="preferredCurrency"
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            placeholder="USD"
            disabled={isPending}
            className={`min-h-11`}
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
          <div
            className={`
              flex
              items-center
              gap-2
              rounded-lg
              bg-primary-50
              px-3
              py-2
              dark:bg-primary-900/20
            `}
            role="status"
          >
            <svg
              className={`
                h-4
                w-4
                animate-spin
                text-primary-600
                dark:text-primary-400
              `}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className={`opacity-25`} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className={`opacity-75`}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p
              className={`
              text-sm
              font-medium
              text-primary-700
              dark:text-primary-300
            `}
            >
              Updating currency...
            </p>
          </div>
        )}
      </form>
    </FormCard>
  );
}
