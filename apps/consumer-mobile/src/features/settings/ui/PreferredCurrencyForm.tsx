'use client';

import { useActionState, useState, startTransition } from 'react';

import { CURRENCY_CODES } from '@remoola/api-types';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { updatePreferredCurrencyAction } from '../actions';
import styles from './PreferredCurrencyForm.module.css';

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
      showErrorToast(getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)), {
        code: result.error.code,
      });
      return result;
    }

    showSuccessToast(`Preferred currency updated`);
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
      <form action={formAction} className={styles.form}>
        <FormField label="Currency" htmlFor="preferredCurrency">
          <FormSelect
            id="preferredCurrency"
            name="preferredCurrency"
            options={CURRENCY_OPTIONS}
            value={selectedCurrency}
            placeholder="USD"
            disabled={isPending}
            className={styles.inputMinHeight}
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

        {isPending ? (
          <div className={styles.loadingBanner} role="status">
            <SpinnerIcon className={styles.spinnerIcon} />
            <p className={styles.loadingText}>Updating currency...</p>
          </div>
        ) : null}
      </form>
    </FormCard>
  );
}
