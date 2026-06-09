'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { buildWithdrawViewModel } from './withdraw-view-model';
import { submitTransferAction, submitWithdrawAction } from '../../../lib/mutations/payments.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Field } from '../../../shared/ui/shell-data-display';
import { shellGridContent2 } from '../../../shared/ui/shell-grid-tokens';

type PaymentMethod = {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  defaultSelected?: boolean;
};

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount / 100);
}

type Props = {
  balances: Record<string, number> | null;
  bankMethods: PaymentMethod[];
};

type Tab = `withdraw` | `transfer`;

export function WithdrawFlowClient({ balances, bankMethods }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>(`withdraw`);
  const [withdrawAmount, setWithdrawAmount] = useState(``);
  const [withdrawCurrency, setWithdrawCurrency] = useState(
    Object.entries(balances ?? {}).find(([, value]) => value > 0)?.[0] ?? Object.keys(balances ?? {})[0] ?? `USD`,
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    bankMethods.find((method) => method.defaultSelected)?.id ?? bankMethods[0]?.id ?? ``,
  );
  const [withdrawNote, setWithdrawNote] = useState(``);
  const [transferAmount, setTransferAmount] = useState(``);
  const [transferCurrency, setTransferCurrency] = useState(
    Object.entries(balances ?? {}).find(([, value]) => value > 0)?.[0] ?? Object.keys(balances ?? {})[0] ?? `USD`,
  );
  const [recipient, setRecipient] = useState(``);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const viewModel = buildWithdrawViewModel({
    activeTab,
    balances,
    bankMethods,
    isPending,
    paymentMethodId,
    recipient,
    transferAmount,
    transferCurrency,
    withdrawAmount,
    withdrawCurrency,
  });

  function clearFeedback() {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  }

  function renderFieldError(key: string) {
    const message = fieldErrors[key];
    if (!message) return null;
    return <div className="mt-2 text-sm text-(--app-danger-text)">{message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab(`withdraw`);
            clearFeedback();
          }}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            activeTab === `withdraw`
              ? `border-(--app-primary-soft) bg-(--app-primary) text-(--app-text)`
              : `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`
          }`}
        >
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab(`transfer`);
            clearFeedback();
          }}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            activeTab === `transfer`
              ? `border-(--app-primary-soft) bg-(--app-primary) text-(--app-text)`
              : `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`
          }`}
        >
          Transfer
        </button>
      </div>

      <Field
        label="Available balance"
        value={formatCurrency(viewModel.activeBalanceAmount, viewModel.activeBalanceCurrency)}
      />

      {activeTab === `withdraw` ? (
        <>
          {!viewModel.hasBankMethod ? (
            <div className="rounded-2xl border border-(--app-warning-soft) bg-(--app-warning-soft) px-4 py-3 text-sm text-(--app-warning-text)">
              Add a bank account in the Banking section before creating a withdrawal.
            </div>
          ) : null}
          {!viewModel.hasPositiveBalance ? (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-muted)">
              Withdrawals unlock once at least one balance becomes positive.
            </div>
          ) : null}
          <div className={shellGridContent2}>
            <div>
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="withdraw-amount">
                Amount
              </label>
              <input
                id="withdraw-amount"
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(event) => {
                  setWithdrawAmount(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
                placeholder="0.00"
              />
              {viewModel.hasWithdrawInsufficientFunds ? (
                <div className="mt-2 text-sm text-(--app-danger-text)">
                  Entered amount is greater than the available balance.
                </div>
              ) : null}
              {renderFieldError(`amount`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="withdraw-currency">
                Currency
              </label>
              <select
                id="withdraw-currency"
                value={withdrawCurrency}
                onChange={(event) => {
                  setWithdrawCurrency(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
              >
                {Object.keys(balances ?? {}).length === 0 ? <option value="USD">USD</option> : null}
                {Object.keys(balances ?? {}).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              {renderFieldError(`currency`)}
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="withdraw-destination">
                Destination bank account
              </label>
              <select
                id="withdraw-destination"
                value={paymentMethodId}
                onChange={(event) => {
                  setPaymentMethodId(event.target.value);
                  clearFeedback();
                }}
                disabled={bankMethods.length === 0}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bankMethods.length === 0 ? <option value="">No bank account connected</option> : null}
                {bankMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {(method.brand ?? `Bank account`) + (method.last4 ? ` •••• ${method.last4}` : ``)}
                  </option>
                ))}
              </select>
              {renderFieldError(`paymentMethodId`)}
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="withdraw-note">
                Note
              </label>
              <textarea
                id="withdraw-note"
                rows={3}
                value={withdrawNote}
                onChange={(event) => {
                  setWithdrawNote(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
                placeholder="Optional note for this payout"
              />
            </div>
          </div>
          <Field
            label="Fee estimate"
            value={bankMethods.length > 0 ? `Calculated at withdrawal time` : `Connect a bank account first`}
          />
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
            Transfers move available balance to an existing consumer account already registered under the recipient
            email or phone number.
          </div>
          {!viewModel.hasPositiveBalance ? (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-muted)">
              Transfers unlock once at least one balance becomes positive.
            </div>
          ) : null}
          <div className={shellGridContent2}>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="transfer-recipient">
                Recipient email or phone
              </label>
              <input
                id="transfer-recipient"
                type="text"
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
                placeholder="recipient@example.com"
              />
              <div className="mt-2 text-sm text-(--app-text-muted)">
                The recipient must already exist as a consumer account for the transfer to complete.
              </div>
              {renderFieldError(`recipient`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="transfer-amount">
                Amount
              </label>
              <input
                id="transfer-amount"
                type="number"
                min="0"
                step="0.01"
                value={transferAmount}
                onChange={(event) => {
                  setTransferAmount(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
                placeholder="0.00"
              />
              {viewModel.hasTransferInsufficientFunds ? (
                <div className="mt-2 text-sm text-(--app-danger-text)">
                  Entered amount is greater than the available balance.
                </div>
              ) : null}
              {renderFieldError(`amount`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="transfer-currency">
                Currency
              </label>
              <select
                id="transfer-currency"
                value={transferCurrency}
                onChange={(event) => {
                  setTransferCurrency(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
              >
                {Object.keys(balances ?? {}).length === 0 ? <option value="USD">USD</option> : null}
                {Object.keys(balances ?? {}).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              {renderFieldError(`currency`)}
            </div>
          </div>
        </>
      )}

      {error ? (
        <div className="rounded-2xl border border-(--app-danger-soft) bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-(--app-success-soft) bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)">
          {success}
        </div>
      ) : null}
      <button
        type="button"
        disabled={activeTab === `withdraw` ? viewModel.withdrawSubmitDisabled : viewModel.transferSubmitDisabled}
        onClick={() => {
          clearFeedback();
          startTransition(async () => {
            const result =
              activeTab === `withdraw`
                ? await submitWithdrawAction({
                    amount: withdrawAmount,
                    currency: withdrawCurrency,
                    paymentMethodId,
                    note: withdrawNote,
                  })
                : await submitTransferAction({
                    amount: transferAmount,
                    currency: transferCurrency,
                    recipient,
                  });
            if (!result.ok) {
              if (handleSessionExpiredError(result.error)) return;
              if (result.error.fields) {
                setFieldErrors(result.error.fields);
              }
              setError(result.error.message);
              return;
            }
            if (activeTab === `withdraw`) {
              setWithdrawAmount(``);
              setWithdrawNote(``);
              setSuccess(result.message ?? `Withdrawal initiated successfully`);
            } else {
              setTransferAmount(``);
              setRecipient(``);
              setSuccess(result.message ?? `Transfer completed successfully`);
            }
            router.refresh();
          });
        }}
        className="w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeTab === `withdraw` ? viewModel.withdrawSubmitLabel : viewModel.transferSubmitLabel}
      </button>
    </div>
  );
}
