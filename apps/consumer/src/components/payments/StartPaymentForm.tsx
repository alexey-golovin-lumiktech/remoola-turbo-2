'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { AmountCurrencyInput, FormField, FormSelect, RecipientEmailField, type FormSelectOption } from '../ui';
import styles from '../ui/classNames.module.css';

const { buttonDisabledOpacity, buttonPrimaryRoundedCompact, formFieldSpacing, spaceY4 } = styles;

const PAYMENT_METHOD_OPTIONS: FormSelectOption[] = [
  { value: `CREDIT_CARD`, label: `Credit Card` },
  { value: `BANK_ACCOUNT`, label: `Bank Account` },
];

export function StartPaymentForm() {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(`USD`);
  const [defaultCurrencyLoaded, setDefaultCurrencyLoaded] = useState(false);

  useEffect(() => {
    if (defaultCurrencyLoaded) return;
    let cancelled = false;
    fetch(`/api/settings`, { credentials: `include`, cache: `no-store` })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredCurrency?: TCurrencyCode | null } | null) => {
        if (cancelled || !data?.preferredCurrency) return;
        if (ALL_CURRENCY_CODES.includes(data.preferredCurrency)) {
          setCurrencyCode(data.preferredCurrency);
        }
      })
      .finally(() => setDefaultCurrencyLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [defaultCurrencyLoaded]);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState<`CREDIT_CARD` | `BANK_ACCOUNT`>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error(`Please enter recipient email.`);
      return;
    }
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(`Please enter a valid amount.`);
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/payments/start`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        email: trimmedEmail,
        amount,
        currencyCode,
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
      toast.error(err.message || `Payment failed`);
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
      <RecipientEmailField
        label="Recipient Email"
        description="We'll send the payment to this address. They can pay with card or bank."
        value={email}
        onChange={setEmail}
        required
      />

      <AmountCurrencyInput
        amount={amount}
        onAmountChange={setAmount}
        currencyCode={currencyCode}
        onCurrencyChange={setCurrencyCode}
        required
        placeholder="0.00"
      />

      <FormField label="Description">
        <textarea
          className={formFieldSpacing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormSelect
        label="Payment Method"
        value={method}
        onChange={(v) => setMethod(v as `CREDIT_CARD` | `BANK_ACCOUNT`)}
        options={PAYMENT_METHOD_OPTIONS}
        placeholder="Select payment method..."
        isClearable={false}
      />

      <button disabled={loading} className={`${buttonPrimaryRoundedCompact} ${buttonDisabledOpacity}`}>
        {loading ? `Processing...` : `Send Payment`}
      </button>
    </form>
  );
}
