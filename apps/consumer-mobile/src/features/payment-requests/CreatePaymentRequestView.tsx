'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CURRENCY_CODE, type TCurrencyCode } from '@remoola/api-types';

import styles from './CreatePaymentRequestView.module.css';
import { type CreatePaymentRequestPayload } from './schemas';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { showErrorToast } from '../../lib/toast.client';
import { DateInput } from '../../shared/ui/DateInput';

export function CreatePaymentRequestView() {
  const router = useRouter();
  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(CURRENCY_CODE.USD);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes(`@`)) {
      showErrorToast(getLocalToastMessage(localToastKeys.VALIDATION_RECIPIENT_EMAIL));
      return;
    }
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      showErrorToast(getLocalToastMessage(localToastKeys.VALIDATION_AMOUNT));
      return;
    }
    setLoading(true);
    try {
      const payload: CreatePaymentRequestPayload = {
        email: normalizedEmail,
        amount,
        currencyCode,
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
      };
      const res = await fetch(`/api/payment-requests`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        const code = err.code;
        const msg = getErrorMessageForUser(
          code,
          err.message ?? getLocalToastMessage(localToastKeys.PAYMENT_REQUEST_CREATE_FAILED),
        );
        showErrorToast(msg, code ? { code } : undefined);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { paymentRequestId?: string };
      if (data.paymentRequestId) {
        router.push(`/payments/${data.paymentRequestId}`);
      } else {
        router.push(`/payments`);
      }
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_REQUEST_CREATE_FAILED));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} data-testid="create-payment-request-form">
      <h2 className={styles.title}>New payment request</h2>
      <div>
        <label htmlFor="pr-email" className={styles.label}>
          Recipient email
        </label>
        <input
          id="pr-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label htmlFor="pr-amount" className={styles.label}>
          Amount
        </label>
        <input
          id="pr-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label htmlFor="pr-currency" className={styles.label}>
          Currency
        </label>
        <select
          id="pr-currency"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value as TCurrencyCode)}
          className="input"
        >
          <option value={CURRENCY_CODE.USD}>USD</option>
          <option value={CURRENCY_CODE.EUR}>EUR</option>
          <option value={CURRENCY_CODE.GBP}>GBP</option>
        </select>
      </div>
      <div>
        <label htmlFor="pr-description" className={styles.label}>
          Description (optional)
        </label>
        <input
          id="pr-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="pr-due" className={styles.label}>
          Due date (optional)
        </label>
        <DateInput
          id="pr-due"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().split(`T`)[0]}
          className="input"
        />
      </div>
      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? `Creating…` : `Create payment request`}
      </button>
    </form>
  );
}
