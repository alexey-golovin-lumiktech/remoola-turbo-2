'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { submitTransferAction, submitWithdrawAction } from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Field } from '../../../shared/ui/shell-primitives';

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

  const hasBankMethod = bankMethods.length > 0;
  const hasPositiveBalance = Object.values(balances ?? {}).some((value) => value > 0);
  const withdrawSelectedBalance = balances?.[withdrawCurrency] ?? 0;
  const transferSelectedBalance = balances?.[transferCurrency] ?? 0;
  const parsedWithdrawAmount = Number(withdrawAmount);
  const isWithdrawAmountValid = Number.isFinite(parsedWithdrawAmount) && parsedWithdrawAmount > 0;
  const requestedWithdrawMinorAmount = isWithdrawAmountValid ? Math.round(parsedWithdrawAmount * 100) : 0;
  const hasWithdrawInsufficientFunds = isWithdrawAmountValid && requestedWithdrawMinorAmount > withdrawSelectedBalance;
  const parsedTransferAmount = Number(transferAmount);
  const isTransferAmountValid = Number.isFinite(parsedTransferAmount) && parsedTransferAmount > 0;
  const requestedTransferMinorAmount = isTransferAmountValid ? Math.round(parsedTransferAmount * 100) : 0;
  const hasTransferInsufficientFunds = isTransferAmountValid && requestedTransferMinorAmount > transferSelectedBalance;
  const withdrawSubmitDisabled =
    isPending ||
    !hasBankMethod ||
    !hasPositiveBalance ||
    !paymentMethodId ||
    !isWithdrawAmountValid ||
    hasWithdrawInsufficientFunds;
  const transferSubmitDisabled =
    isPending || !hasPositiveBalance || !recipient.trim() || !isTransferAmountValid || hasTransferInsufficientFunds;
  const withdrawSubmitLabel = !hasBankMethod
    ? `Connect a bank account to continue`
    : !hasPositiveBalance
      ? `No withdrawable balance available`
      : hasWithdrawInsufficientFunds
        ? `Amount exceeds available balance`
        : isPending
          ? `Submitting...`
          : `Create withdrawal`;
  const transferSubmitLabel = !hasPositiveBalance
    ? `No transferable balance available`
    : hasTransferInsufficientFunds
      ? `Amount exceeds available balance`
      : isPending
        ? `Submitting...`
        : `Send transfer`;

  function clearFeedback() {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  }

  function renderFieldError(key: string) {
    const message = fieldErrors[key];
    if (!message) return null;
    return <div className="mt-2 text-sm text-rose-200">{message}</div>;
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
              ? `border-blue-400/30 bg-blue-500 text-white`
              : `border-white/10 bg-white/5 text-white/75`
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
              ? `border-blue-400/30 bg-blue-500 text-white`
              : `border-white/10 bg-white/5 text-white/75`
          }`}
        >
          Transfer
        </button>
      </div>

      <Field
        label="Available balance"
        value={formatCurrency(
          activeTab === `withdraw` ? withdrawSelectedBalance : transferSelectedBalance,
          activeTab === `withdraw` ? withdrawCurrency : transferCurrency,
        )}
      />

      {activeTab === `withdraw` ? (
        <>
          {!hasBankMethod ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Add a bank account in the Banking section before creating a withdrawal.
            </div>
          ) : null}
          {!hasPositiveBalance ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
              Withdrawals unlock once at least one balance becomes positive.
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="withdraw-amount">
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
                placeholder="0.00"
              />
              {hasWithdrawInsufficientFunds ? (
                <div className="mt-2 text-sm text-rose-200">Entered amount is greater than the available balance.</div>
              ) : null}
              {renderFieldError(`amount`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="withdraw-currency">
                Currency
              </label>
              <select
                id="withdraw-currency"
                value={withdrawCurrency}
                onChange={(event) => {
                  setWithdrawCurrency(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
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
              <label className="mb-2 block text-sm text-white/55" htmlFor="withdraw-destination">
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
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              <label className="mb-2 block text-sm text-white/55" htmlFor="withdraw-note">
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
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
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            Transfers move available balance to an existing consumer account already registered under the recipient
            email or phone number.
          </div>
          {!hasPositiveBalance ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
              Transfers unlock once at least one balance becomes positive.
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-white/55" htmlFor="transfer-recipient">
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
                placeholder="recipient@example.com"
              />
              <div className="mt-2 text-sm text-white/45">
                The recipient must already exist as a consumer account for the transfer to complete.
              </div>
              {renderFieldError(`recipient`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="transfer-amount">
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
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
                placeholder="0.00"
              />
              {hasTransferInsufficientFunds ? (
                <div className="mt-2 text-sm text-rose-200">Entered amount is greater than the available balance.</div>
              ) : null}
              {renderFieldError(`amount`)}
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="transfer-currency">
                Currency
              </label>
              <select
                id="transfer-currency"
                value={transferCurrency}
                onChange={(event) => {
                  setTransferCurrency(event.target.value);
                  clearFeedback();
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
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
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}
      <button
        type="button"
        disabled={activeTab === `withdraw` ? withdrawSubmitDisabled : transferSubmitDisabled}
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
        className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeTab === `withdraw` ? withdrawSubmitLabel : transferSubmitLabel}
      </button>
    </div>
  );
}
