'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { omit } from '../../../shared/utils/object-utils';
import { withdrawFundsAction, transferFundsAction } from '../actions';
import { type Balance } from '../schemas';

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
      setErrors(result.error.fields ?? { submit: result.error.message });
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
      setErrors(result.error.fields ?? { submit: result.error.message });
      return;
    }

    setSuccess(`Transfer completed successfully`);
    setTransferData({ amount: ``, currency: `USD`, recipientId: ``, note: `` });
    startTransition(() => {
      router.refresh();
    });
  };

  const balanceDisplay = balance
    ? Object.entries(balance.available ?? {})
        .filter(([, amount]) => amount > 0)
        .map(([code, amount]) => `${code} ${(amount / 100).toFixed(2)}`)
        .join(`, `)
    : `Loading...`;

  return (
    <div
      className={`
  mx-auto
  max-w-2xl
  space-y-6
  p-4
  pb-20
      `}
    >
      <div>
        <h1
          className={`
  text-2xl
  font-bold
  text-slate-900
  dark:text-white
          `}
        >
          Withdraw & Transfer
        </h1>
        <p
          className={`
  mt-1
  text-sm
  text-slate-600
  dark:text-slate-400
          `}
        >
          Available balance: {balanceDisplay}
        </p>
      </div>

      <div
        className={`
  flex
  gap-2
  border-b
  border-slate-200
  dark:border-slate-700
        `}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab(`withdraw`);
            setErrors({});
            setSuccess(null);
          }}
          className={`
            min-h-[44px]
            px-4
            py-2
            text-sm
            font-medium
            transition-colors
            ${
              activeTab === `withdraw`
                ? `border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400`
                : `text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200`
            }
          `}
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
          className={`
            min-h-[44px]
            px-4
            py-2
            text-sm
            font-medium
            transition-colors
            ${
              activeTab === `transfer`
                ? `border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400`
                : `text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200`
            }
          `}
        >
          Transfer
        </button>
      </div>

      {success && (
        <div
          className={`
  animate-fadeIn
  rounded-lg
  border
  border-green-200
  bg-green-50
  p-4
  dark:border-green-900/50
  dark:bg-green-900/20
          `}
          role="alert"
        >
          <div className={`flex items-start gap-3`}>
            <svg
              className={`
  mt-0.5
  h-5
  w-5
  shrink-0
  text-green-600
  dark:text-green-400
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p
              className={`
  text-sm
  font-medium
  text-green-900
  dark:text-green-200
              `}
            >
              {success}
            </p>
          </div>
        </div>
      )}

      <div
        className={`
  rounded-2xl
  border
  border-slate-200
  bg-white
  p-6
  shadow-sm
  dark:border-slate-700
  dark:bg-slate-900
        `}
      >
        {activeTab === `withdraw` ? (
          <form onSubmit={handleWithdrawSubmit} className={`space-y-5`}>
            <div>
              <label
                htmlFor="withdraw-amount"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
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
                  if (errors.amount) {
                    setErrors(omit(errors, `amount`));
                  }
                }}
                className={`input ${errors.amount ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? `withdraw-amount-error` : undefined}
              />
              {errors.amount && (
                <p
                  id="withdraw-amount-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="withdraw-currency"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Currency *
              </label>
              <select
                id="withdraw-currency"
                value={withdrawData.currency}
                onChange={(e) => setWithdrawData((prev) => ({ ...prev, currency: e.target.value }))}
                className={`input`}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="withdraw-payment-method"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Payment Method *
              </label>
              <input
                id="withdraw-payment-method"
                type="text"
                value={withdrawData.paymentMethodId}
                onChange={(e) => {
                  setWithdrawData((prev) => ({ ...prev, paymentMethodId: e.target.value }));
                  if (errors.paymentMethodId) {
                    setErrors(omit(errors, `paymentMethodId`));
                  }
                }}
                className={`input ${errors.paymentMethodId ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                placeholder="Payment method ID"
                aria-invalid={!!errors.paymentMethodId}
                aria-describedby={errors.paymentMethodId ? `withdraw-payment-method-error` : undefined}
              />
              {errors.paymentMethodId && (
                <p
                  id="withdraw-payment-method-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {errors.paymentMethodId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="withdraw-note"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Note (optional)
              </label>
              <textarea
                id="withdraw-note"
                value={withdrawData.note}
                onChange={(e) => setWithdrawData((prev) => ({ ...prev, note: e.target.value }))}
                className={`input`}
                placeholder="Add a note for your records"
                rows={3}
                maxLength={200}
              />
            </div>

            {errors.submit && (
              <div
                className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
                `}
                role="alert"
              >
                <p className={`text-sm text-red-800 dark:text-red-300`}>{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`
  min-h-[48px]
  w-full
  rounded-xl
  bg-primary-600
  px-4
  py-3
  text-sm
  font-semibold
  text-white
  shadow-sm
  transition-all
  hover:bg-primary-700
  hover:shadow-md
  focus:outline-none
  focus:ring-2
  focus:ring-primary-500
  focus:ring-offset-2
  disabled:cursor-not-allowed
  disabled:opacity-60
              `}
            >
              {isPending ? `Processing...` : `Withdraw funds`}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTransferSubmit} className={`space-y-5`}>
            <div>
              <label
                htmlFor="transfer-amount"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
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
                  if (errors.amount) {
                    setErrors(omit(errors, `amount`));
                  }
                }}
                className={`input ${errors.amount ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? `transfer-amount-error` : undefined}
              />
              {errors.amount && (
                <p
                  id="transfer-amount-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="transfer-currency"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Currency *
              </label>
              <select
                id="transfer-currency"
                value={transferData.currency}
                onChange={(e) => setTransferData((prev) => ({ ...prev, currency: e.target.value }))}
                className={`input`}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="transfer-recipient"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Recipient *
              </label>
              <input
                id="transfer-recipient"
                type="text"
                value={transferData.recipientId}
                onChange={(e) => {
                  setTransferData((prev) => ({ ...prev, recipientId: e.target.value }));
                  if (errors.recipientId) {
                    setErrors(omit(errors, `recipientId`));
                  }
                }}
                className={`input ${errors.recipientId ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                placeholder="Recipient ID or email"
                aria-invalid={!!errors.recipientId}
                aria-describedby={errors.recipientId ? `transfer-recipient-error` : undefined}
              />
              {errors.recipientId && (
                <p
                  id="transfer-recipient-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {errors.recipientId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="transfer-note"
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
              >
                Note (optional)
              </label>
              <textarea
                id="transfer-note"
                value={transferData.note}
                onChange={(e) => setTransferData((prev) => ({ ...prev, note: e.target.value }))}
                className={`input`}
                placeholder="Add a message for the recipient"
                rows={3}
                maxLength={200}
              />
            </div>

            {errors.submit && (
              <div
                className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
                `}
                role="alert"
              >
                <p className={`text-sm text-red-800 dark:text-red-300`}>{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`
  min-h-[48px]
  w-full
  rounded-xl
  bg-primary-600
  px-4
  py-3
  text-sm
  font-semibold
  text-white
  shadow-sm
  transition-all
  hover:bg-primary-700
  hover:shadow-md
  focus:outline-none
  focus:ring-2
  focus:ring-primary-500
  focus:ring-offset-2
  disabled:cursor-not-allowed
  disabled:opacity-60
              `}
            >
              {isPending ? `Processing...` : `Transfer funds`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
