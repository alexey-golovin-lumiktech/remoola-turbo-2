'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { usePreferredCurrency } from '../../lib/hooks';
import { AmountCurrencyInput, FormCard, FormField, RecipientEmailField } from '../ui';
import { SuccessModal } from './SuccessModal';
import { getErrorMessageForUser } from '../../lib/error-messages';
import styles from '../ui/classNames.module.css';

const { formInputRoundedLg, primaryButtonClass, textMutedSlate } = styles;

export function TransferForm() {
  const { preferredCurrency } = usePreferredCurrency();
  const [amount, setAmount] = useState(``);
  const defaultCurrency: TCurrencyCode =
    preferredCurrency && ALL_CURRENCY_CODES.includes(preferredCurrency as TCurrencyCode)
      ? (preferredCurrency as TCurrencyCode)
      : `USD`;
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(defaultCurrency);
  const [recipient, setRecipient] = useState(``);
  const [note, setNote] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (preferredCurrency && ALL_CURRENCY_CODES.includes(preferredCurrency as TCurrencyCode)) {
      setCurrencyCode(preferredCurrency as TCurrencyCode);
    }
  }, [preferredCurrency]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(`Please enter a valid amount.`);
      return;
    }
    if (!recipient.trim()) {
      toast.error(`Please enter recipient email.`);
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`/api/payments/transfer`, {
        method: `POST`,
        headers: {
          'content-type': `application/json`,
          'idempotency-key': idempotencyKey,
        },
        credentials: `include`,
        body: JSON.stringify({
          amount: numericAmount,
          currencyCode,
          recipient: recipient.trim(),
          note: note || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = text || `Transfer failed (${res.status})`;
        try {
          const body = JSON.parse(text) as { message?: string; code?: string };
          msg = getErrorMessageForUser(body?.message ?? body?.code, msg);
        } catch {
          msg = getErrorMessageForUser(text || undefined, msg);
        }
        toast.error(msg);
        return;
      }

      setSuccessOpen(true);
      setAmount(``);
      setCurrencyCode(
        preferredCurrency && ALL_CURRENCY_CODES.includes(preferredCurrency as TCurrencyCode)
          ? (preferredCurrency as TCurrencyCode)
          : `USD`,
      );
      setRecipient(``);
      setNote(``);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : `Transfer failed.`;
      toast.error(getErrorMessageForUser(raw, raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard
      onSubmit={onSubmit}
      title="Transfer to another person"
      description="Send money to another user using their email number."
    >
      <AmountCurrencyInput
        amount={amount}
        onAmountChange={setAmount}
        currencyCode={currencyCode}
        onCurrencyChange={setCurrencyCode}
        placeholder="0.00"
      />

      <RecipientEmailField
        label="Recipient (email)"
        description="Enter the email of the Remoola user you want to send money to."
        value={recipient}
        onChange={setRecipient}
        placeholder="example@email.com"
        inputClassName={formInputRoundedLg}
      />

      <FormField
        label={
          <>
            Note <span className={textMutedSlate}>(optional)</span>
          </>
        }
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={formInputRoundedLg}
          placeholder="What is this transfer for?"
        />
      </FormField>

      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? `Processing…` : `Send transfer`}
      </button>

      <SuccessModal
        open={successOpen}
        title="Transfer sent"
        description="Your transfer has been sent successfully."
        onCloseAction={() => setSuccessOpen(false)}
      />
    </FormCard>
  );
}
