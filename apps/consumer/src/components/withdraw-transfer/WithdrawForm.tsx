'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { usePreferredCurrency } from '../../lib/hooks';
import { AmountCurrencyInput, FormCard, FormField } from '../ui';
import { SuccessModal } from './SuccessModal';
import { getErrorMessageForUser } from '../../lib/error-messages';
import styles from '../ui/classNames.module.css';

const { flexRowGap3, primaryButtonClass } = styles;

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
  const { preferredCurrency } = usePreferredCurrency();
  const [amount, setAmount] = useState(``);
  const defaultCurrency: TCurrencyCode =
    preferredCurrency && ALL_CURRENCY_CODES.includes(preferredCurrency as TCurrencyCode)
      ? (preferredCurrency as TCurrencyCode)
      : `USD`;
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(defaultCurrency);
  const [method, setMethod] = useState<`BANK_ACCOUNT` | `CREDIT_CARD` | ``>(``);
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
    if (!method) {
      toast.error(`Please select a withdrawal method.`);
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`/api/payments/withdraw`, {
        method: `POST`,
        headers: {
          'content-type': `application/json`,
          'idempotency-key': idempotencyKey,
        },
        credentials: `include`,
        body: JSON.stringify({
          originalAmount: amount,
          amount: numericAmount,
          currencyCode,
          method,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = text || `Withdrawal failed (${res.status})`;
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
      setMethod(``);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : `Withdrawal failed.`;
      toast.error(getErrorMessageForUser(raw, raw));
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
      <AmountCurrencyInput
        amount={amount}
        onAmountChange={setAmount}
        currencyCode={currencyCode}
        onCurrencyChange={setCurrencyCode}
        placeholder="0.00"
      />

      <FormField label="Withdraw to">
        <div className={flexRowGap3}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMethod(`CREDIT_CARD`);
            }}
            className={getToggleButtonClasses(method === `CREDIT_CARD`, `lg`)}
          >
            Card
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMethod(`BANK_ACCOUNT`);
            }}
            className={getToggleButtonClasses(method === `BANK_ACCOUNT`, `lg`)}
          >
            Bank account
          </button>
        </div>
      </FormField>

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
