'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormField } from '../ui';
import styles from '../ui/classNames.module.css';

const { buttonDisabledOpacity, buttonPrimaryRoundedCompact, formFieldSpacing, formInputFullWidth, spaceY4 } = styles;

export function StartPaymentForm() {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState<`CREDIT_CARD` | `BANK_ACCOUNT`>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    const res = await fetch(`/api/payments/start`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        email,
        amount,
        description,
        method,
      }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/payments/${data.paymentRequestId}`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || `Payment failed`);
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
      <FormField label="Recipient Email">
        <input
          type="email"
          required
          className={formFieldSpacing}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <FormField label="Amount (USD)">
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

      <FormField label="Description">
        <textarea
          className={formFieldSpacing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Payment Method">
        <select
          className={formInputFullWidth}
          value={method}
          onChange={(e) => setMethod(e.target.value as `CREDIT_CARD` | `BANK_ACCOUNT`)}
        >
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="BANK_ACCOUNT">Bank Account</option>
        </select>
      </FormField>

      <button disabled={loading} className={`${buttonPrimaryRoundedCompact} ${buttonDisabledOpacity}`}>
        {loading ? `Processing...` : `Send Payment`}
      </button>
    </form>
  );
}
