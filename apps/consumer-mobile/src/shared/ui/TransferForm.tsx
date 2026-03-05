'use client';

import { useState } from 'react';

import { AmountCurrencyInput } from './AmountCurrencyInput';
import { Button } from './Button';
import { FormField } from './FormField';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { showErrorToast, showSuccessToast } from '../../lib/toast.client';

interface TransferFormProps {
  availableCurrencies: Array<{ code: string; symbol: string }>;
  contacts: Array<{ id: string; name: string; email: string }>;
  onSubmit: (data: TransferFormData) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  onSuccess?: () => void;
}

export interface TransferFormData {
  amount: number;
  currency: string;
  recipientId: string;
  note?: string;
}

/**
 * TransferForm - Form for transferring funds to other users
 * Uses toast notifications for user feedback
 */
export function TransferForm({ availableCurrencies, contacts, onSubmit, onSuccess }: TransferFormProps) {
  const [amount, setAmount] = useState(``);
  const [currency, setCurrency] = useState(`USD`);
  const [recipientId, setRecipientId] = useState(``);
  const [note, setNote] = useState(``);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = `Please enter a valid amount`;
    }

    if (!recipientId) {
      newErrors.recipientId = `Please select a recipient`;
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
        recipientId,
        note: note || undefined,
      });

      if (!result.ok && result.error) {
        showErrorToast(result.error.message, { code: result.error.code });
        return;
      }

      const recipient = contacts.find((c) => c.id === recipientId);
      showSuccessToast(`Transfer completed successfully`, {
        description: recipient ? `${amount} ${currency} sent to ${recipient.name}` : undefined,
      });

      setAmount(``);
      setNote(``);
      setRecipientId(``);

      onSuccess?.();
    } catch {
      showErrorToast(`Transfer failed. Please try again.`, { code: `TRANSFER_FAILED` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Amount" htmlFor="transfer-amount" error={errors.amount} required>
        <AmountCurrencyInput
          id="transfer-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          currency={currency}
          onCurrencyChange={setCurrency}
          availableCurrencies={availableCurrencies}
          placeholder="0.00"
          error={!!errors.amount}
        />
      </FormField>

      <FormField label="Transfer to" htmlFor="transfer-recipient" error={errors.recipientId} required>
        <FormSelect
          id="transfer-recipient"
          options={[
            { value: ``, label: `Select recipient` },
            ...contacts.map((contact) => ({
              value: contact.id,
              label: `${contact.name} (${contact.email})`,
            })),
          ]}
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          error={!!errors.recipientId}
        />
      </FormField>

      <FormField label="Note (optional)" htmlFor="transfer-note" hint="Add a message for the recipient">
        <FormInput
          id="transfer-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Payment for services"
          maxLength={200}
        />
      </FormField>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="flex-1">
          Transfer funds
        </Button>
      </div>
    </form>
  );
}
