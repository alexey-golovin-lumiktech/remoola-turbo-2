'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast } from '../../../lib/toast.client';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { omit } from '../../../shared/utils/object-utils';
import { withdrawFundsAction, transferFundsAction } from '../actions';
import { type Balance } from '../schemas';
import styles from './WithdrawTransferView.module.css';

interface WithdrawTransferViewProps {
  balance: Balance | null;
}

type Tab = `withdraw` | `transfer`;

export function WithdrawTransferView({ balance }: WithdrawTransferViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>(`withdraw`);
  const [withdrawData, setWithdrawData] = useState({ amount: ``, currency: `USD`, paymentMethodId: ``, note: `` });
  const [transferData, setTransferData] = useState({ amount: ``, currency: `USD`, recipientId: ``, note: `` });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(null);

    const result = await withdrawFundsAction({
      amount: parseFloat(withdrawData.amount),
      currency: withdrawData.currency,
      paymentMethodId: withdrawData.paymentMethodId,
      note: withdrawData.note || undefined,
    });

    if (!result.ok) {
      if (result.error.fields) {
        setErrors(result.error.fields);
      } else {
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
          { code: result.error.code },
        );
      }
      return;
    }

    setSuccess(`Withdrawal initiated successfully`);
    setWithdrawData({ amount: ``, currency: `USD`, paymentMethodId: ``, note: `` });
    startTransition(() => {
      router.refresh();
    });
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(null);

    const result = await transferFundsAction({
      amount: parseFloat(transferData.amount),
      currency: transferData.currency,
      recipientId: transferData.recipientId,
      note: transferData.note || undefined,
    });

    if (!result.ok) {
      if (result.error.fields) {
        setErrors(result.error.fields);
      } else {
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
          { code: result.error.code },
        );
      }
      return;
    }

    setSuccess(`Transfer completed successfully`);
    setTransferData({ amount: ``, currency: `USD`, recipientId: ``, note: `` });
    startTransition(() => {
      router.refresh();
    });
  };

  const positiveAvailableBalances = balance
    ? Object.entries(balance.available ?? {}).filter(([, amount]) => amount > 0)
    : [];

  const balanceDisplay =
    balance === null
      ? `Unavailable`
      : positiveAvailableBalances.length === 0
        ? `0.00 (no funds available)`
        : positiveAvailableBalances.map(([code, amount]) => `${code} ${(amount / 100).toFixed(2)}`).join(`, `);

  return (
    <div className={styles.main}>
      <div>
        <h1 className={styles.title}>Withdraw & Transfer</h1>
        <p className={styles.subtitle}>Available balance: {balanceDisplay}</p>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => {
            setActiveTab(`withdraw`);
            setErrors({});
            setSuccess(null);
          }}
          className={`${styles.tab} ${activeTab === `withdraw` ? styles.tabActive : styles.tabInactive}`}
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab(`transfer`);
            setErrors({});
            setSuccess(null);
          }}
          className={`${styles.tab} ${activeTab === `transfer` ? styles.tabActive : styles.tabInactive}`}
        >
          Transfer
        </button>
      </div>

      {success ? (
        <div className={styles.successAlert} role="alert">
          <div className={styles.successRow}>
            <CheckIcon className={styles.successIcon} />
            <p className={styles.successText}>{success}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.card}>
        {activeTab === `withdraw` ? (
          <form onSubmit={handleWithdrawSubmit} className={styles.form}>
            <div>
              <label htmlFor="withdraw-amount" className={styles.label}>
                Amount *
              </label>
              <input
                id="withdraw-amount"
                type="number"
                step="0.01"
                min="0"
                value={withdrawData.amount}
                onChange={(e) => {
                  setWithdrawData((prev) => ({ ...prev, amount: e.target.value }));
                  if (errors.amount) setErrors(omit(errors, `amount`));
                }}
                className={`input ${errors.amount ? styles.inputError : ``}`}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? `withdraw-amount-error` : undefined}
              />
              {errors.amount ? (
                <p id="withdraw-amount-error" className={styles.errorMessage} role="alert">
                  {errors.amount}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="withdraw-currency" className={styles.label}>
                Currency *
              </label>
              <select
                id="withdraw-currency"
                value={withdrawData.currency}
                onChange={(e) => setWithdrawData((prev) => ({ ...prev, currency: e.target.value }))}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label htmlFor="withdraw-payment-method" className={styles.label}>
                Payment Method *
              </label>
              <input
                id="withdraw-payment-method"
                type="text"
                value={withdrawData.paymentMethodId}
                onChange={(e) => {
                  setWithdrawData((prev) => ({ ...prev, paymentMethodId: e.target.value }));
                  if (errors.paymentMethodId) setErrors(omit(errors, `paymentMethodId`));
                }}
                className={`input ${errors.paymentMethodId ? styles.inputError : ``}`}
                placeholder="Payment method ID"
                aria-invalid={!!errors.paymentMethodId}
                aria-describedby={errors.paymentMethodId ? `withdraw-payment-method-error` : undefined}
              />
              {errors.paymentMethodId ? (
                <p id="withdraw-payment-method-error" className={styles.errorMessage} role="alert">
                  {errors.paymentMethodId}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="withdraw-note" className={styles.label}>
                Note (optional)
              </label>
              <textarea
                id="withdraw-note"
                value={withdrawData.note}
                onChange={(e) => setWithdrawData((prev) => ({ ...prev, note: e.target.value }))}
                className="input"
                placeholder="Add a note for your records"
                rows={3}
                maxLength={200}
              />
            </div>

            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? `Processing...` : `Withdraw funds`}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTransferSubmit} className={styles.form}>
            <div>
              <label htmlFor="transfer-amount" className={styles.label}>
                Amount *
              </label>
              <input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                value={transferData.amount}
                onChange={(e) => {
                  setTransferData((prev) => ({ ...prev, amount: e.target.value }));
                  if (errors.amount) setErrors(omit(errors, `amount`));
                }}
                className={`input ${errors.amount ? styles.inputError : ``}`}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? `transfer-amount-error` : undefined}
              />
              {errors.amount ? (
                <p id="transfer-amount-error" className={styles.errorMessage} role="alert">
                  {errors.amount}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="transfer-currency" className={styles.label}>
                Currency *
              </label>
              <select
                id="transfer-currency"
                value={transferData.currency}
                onChange={(e) => setTransferData((prev) => ({ ...prev, currency: e.target.value }))}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label htmlFor="transfer-recipient" className={styles.label}>
                Recipient *
              </label>
              <input
                id="transfer-recipient"
                type="text"
                value={transferData.recipientId}
                onChange={(e) => {
                  setTransferData((prev) => ({ ...prev, recipientId: e.target.value }));
                  if (errors.recipientId) setErrors(omit(errors, `recipientId`));
                }}
                className={`input ${errors.recipientId ? styles.inputError : ``}`}
                placeholder="Recipient ID or email"
                aria-invalid={!!errors.recipientId}
                aria-describedby={errors.recipientId ? `transfer-recipient-error` : undefined}
              />
              {errors.recipientId ? (
                <p id="transfer-recipient-error" className={styles.errorMessage} role="alert">
                  {errors.recipientId}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="transfer-note" className={styles.label}>
                Note (optional)
              </label>
              <textarea
                id="transfer-note"
                value={transferData.note}
                onChange={(e) => setTransferData((prev) => ({ ...prev, note: e.target.value }))}
                className="input"
                placeholder="Add a message for the recipient"
                rows={3}
                maxLength={200}
              />
            </div>

            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? `Processing...` : `Transfer funds`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
