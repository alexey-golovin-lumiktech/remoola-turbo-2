'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type CreatePaymentRequestPayload } from '../../types';
import { FormField } from '../ui';
import styles from '../ui/classNames.module.css';

const { buttonDisabledOpacity, buttonPrimaryRoundedCompact, errorTextClass, formFieldSpacing, spaceY4 } = styles;

const CURRENCIES = [`USD`, `EUR`, `GBP`, `JPY`, `AUD`] as const;

export function CreatePaymentRequestForm() {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<(typeof CURRENCIES)[number]>(`USD`);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const payload: CreatePaymentRequestPayload = {
      email,
      amount,
      currencyCode,
      description: description || undefined,
      dueDate: dueDate || undefined,
    };

    const res = await fetch(`/api/payment-requests`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/payments/${data.paymentRequestId}`);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.message || `Request creation failed`);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={spaceY4}
    >
      <FormField label="Recipient Email" description="We’ll notify them once you send the request.">
        <input
          type="email"
          required
          className={formFieldSpacing}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <FormField label={`Amount (${currencyCode})`}>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          className={formFieldSpacing}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Currency">
        <select
          className={formFieldSpacing}
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value as (typeof CURRENCIES)[number])}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Description" description="Shown on the request.">
        <textarea
          className={formFieldSpacing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Due Date" description="Optional deadline for payment.">
        <input type="date" className={formFieldSpacing} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </FormField>

      {error && <div className={errorTextClass}>{error}</div>}

      <button disabled={loading} className={`${buttonPrimaryRoundedCompact} ${buttonDisabledOpacity}`}>
        {loading ? `Creating...` : `Create Request`}
      </button>
    </form>
  );
}
