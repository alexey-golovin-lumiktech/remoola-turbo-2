'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { FormCard, FormField } from '../ui';
import { SuccessModal } from './SuccessModal';
import styles from '../ui/classNames.module.css';

const {
  formInputRoundedLg,
  formInputRoundedLgWithPrefix,
  inputPrefixIcon,
  primaryButtonClass,
  relativePosition,
  textMutedSlate,
} = styles;

export function TransferForm() {
  const [amount, setAmount] = useState(``);
  const [recipient, setRecipient] = useState(``);
  const [note, setNote] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

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
      const res = await fetch(`/api/payments/transfer`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ amount: numericAmount, recipient: recipient.trim(), note: note || null }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Transfer failed (${res.status})`);
      }

      setSuccessOpen(true);
      setAmount(``);
      setRecipient(``);
      setNote(``);
    } catch (e: any) {
      toast.error(e?.message ?? `Transfer failed.`);
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
      <FormField label="Amount">
        <div className={relativePosition}>
          <span className={inputPrefixIcon}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={formInputRoundedLgWithPrefix}
            placeholder="0.00"
          />
        </div>
      </FormField>

      <FormField label="Recipient (email)">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className={formInputRoundedLg}
          placeholder="example@email.com"
        />
      </FormField>

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
