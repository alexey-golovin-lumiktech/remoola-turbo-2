'use client';

import { useActionState, useState, startTransition } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODES } from '@remoola/api-types';

import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
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
            <SpinnerIcon
              className={`
                h-4
                w-4
                animate-spin
                text-primary-600
                dark:text-primary-400
              `}
            />
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
