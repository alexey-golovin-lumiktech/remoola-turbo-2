'use client';

import { useState } from 'react';

import { AmountCurrencyInput } from './AmountCurrencyInput';
import { Button } from './Button';
import { FormField } from './FormField';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import styles from './WithdrawForm.module.css';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../lib/toast.client';

interface WithdrawFormProps {
  availableCurrencies: Array<{ code: string; symbol: string }>;
  paymentMethods: Array<{ id: string; label: string; type: string }>;
  onSubmit: (data: WithdrawFormData) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  onSuccess?: () => void;
}

export interface WithdrawFormData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  note?: string;
}

/**
 * WithdrawForm - Form for withdrawing funds to external accounts
 * Uses toast notifications for user feedback
 */
export function WithdrawForm({ availableCurrencies, paymentMethods, onSubmit, onSuccess }: WithdrawFormProps) {
  const [amount, setAmount] = useState(``);
  const [currency, setCurrency] = useState(`USD`);
  const [paymentMethodId, setPaymentMethodId] = useState(``);
  const [note, setNote] = useState(``);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = `Please enter a valid amount`;
    }

    if (!paymentMethodId) {
      newErrors.paymentMethodId = `Please select a payment method`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await onSubmit({
        amount: parseFloat(amount),
        currency,
        paymentMethodId,
        note: note || undefined,
      });

      if (!result.ok && result.error) {
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
          { code: result.error.code },
        );
        return;
      }

      showSuccessToast(`Withdrawal completed successfully`, {
        description: `${amount} ${currency} will be sent to your account`,
      });

      setAmount(``);
      setNote(``);
      setPaymentMethodId(``);

      onSuccess?.();
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR), { code: `WITHDRAW_FAILED` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <FormField label="Amount" htmlFor="withdraw-amount" error={errors.amount} required>
        <AmountCurrencyInput
          id="withdraw-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          currency={currency}
          onCurrencyChange={setCurrency}
          availableCurrencies={availableCurrencies}
          placeholder="0.00"
          error={!!errors.amount}
        />
      </FormField>

      <FormField label="Withdraw to" htmlFor="withdraw-method" error={errors.paymentMethodId} required>
        <FormSelect
          id="withdraw-method"
          options={[
            { value: ``, label: `Select payment method` },
            ...paymentMethods.map((method) => ({
              value: method.id,
              label: method.label,
            })),
          ]}
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          error={!!errors.paymentMethodId}
        />
      </FormField>

      <FormField label="Note (optional)" htmlFor="withdraw-note" hint="Add a note for your records">
        <FormInput
          id="withdraw-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Monthly expenses"
          maxLength={200}
        />
      </FormField>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="md" isLoading={isLoading} className={styles.submitButton}>
          Withdraw funds
        </Button>
      </div>
    </form>
  );
}
