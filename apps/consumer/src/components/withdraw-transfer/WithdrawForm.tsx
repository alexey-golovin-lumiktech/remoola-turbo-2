'use client';

import { useState } from 'react';

import { FormCard, FormField } from '../ui';
import { SuccessModal } from './SuccessModal';
import styles from '../ui/classNames.module.css';

const {
  errorTextClass,
  formInputRoundedLgWithPrefix,
  inputPrefixIcon,
  flexRowGap3,
  primaryButtonClass,
  relativePosition,
} = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

const pillToggleBase: Record<`md` | `lg`, string> = {
  md: styles.pillToggleBaseMd!,
  lg: styles.pillToggleBaseLg!,
};

const pillToggleActive = styles.pillToggleActive;
const pillToggleInactiveMd = styles.pillToggleInactiveMd;
const pillToggleInactiveLg = styles.pillToggleInactiveLg;

const getToggleButtonClasses = (isActive: boolean, variant: `md` | `lg` = `md`) => {
  const base = pillToggleBase[variant];
  const state = isActive ? pillToggleActive : variant === `lg` ? pillToggleInactiveLg : pillToggleInactiveMd;
  return joinClasses(base, state);
};

export function WithdrawForm() {
  const [amount, setAmount] = useState(``);
  const [method, setMethod] = useState<`BANK_ACCOUNT` | `CREDIT_CARD` | ``>(``);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const [successOpen, setSuccessOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);

    const numericAmount = Number(amount);

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setErr(`Please enter a valid amount.`);
      return;
    }
    if (!method) {
      setErr(`Please select a withdrawal method.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/payments/withdraw`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ originalAmount: amount, amount: numericAmount, method }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Withdrawal failed (${res.status})`);
      }

      setSuccessOpen(true);
      setAmount(``);
      setMethod(``);
    } catch (e: any) {
      setErr(e?.message ?? `Withdrawal failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard
      onSubmit={onSubmit}
      title="Withdraw funds"
      description="Send money from your balance to your card or bank account."
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

      <FormField label="Withdraw to">
        <div className={flexRowGap3}>
          <button
            type="button"
            onClick={() => setMethod(`CREDIT_CARD`)}
            className={getToggleButtonClasses(method === `CREDIT_CARD`, `lg`)}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setMethod(`BANK_ACCOUNT`)}
            className={getToggleButtonClasses(method === `BANK_ACCOUNT`, `lg`)}
          >
            Bank account
          </button>
        </div>
      </FormField>

      {err && <p className={errorTextClass}>{err}</p>}

      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? `Processing…` : `Withdraw`}
      </button>

      <SuccessModal
        open={successOpen}
        title="Withdrawal created"
        description="Your withdrawal request has been submitted. You`ll see it in your transactions shortly."
        onCloseAction={() => setSuccessOpen(false)}
      />
    </FormCard>
  );
}
