'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CURRENCY_CODES } from '@remoola/api-types';

import { getStartPaymentResultHref, type PaymentFlowContext } from '../payment-flow-context';
import {
  buildUnknownRecipientContactsUrl,
  normalizeEmail,
  parseStoredStartPaymentDraft,
  START_PAYMENT_DRAFT_STORAGE_KEY,
  type StartPaymentDraft,
} from './start-payment-draft-flow';
import {
  createContactMutation,
  hasSavedContactByEmailQuery,
  startPaymentMutation,
} from '../../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../../lib/session-expired';
import { Panel } from '../../../../shared/ui/shell-primitives';

type Props = {
  preferredCurrency: string;
  resumeFromDraft: boolean;
  initialEmail?: string;
  paymentFlowContext?: PaymentFlowContext | null;
};

export function StartPaymentClient({
  preferredCurrency,
  resumeFromDraft,
  initialEmail = ``,
  paymentFlowContext,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState(preferredCurrency || `USD`);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState<`CREDIT_CARD` | `BANK_ACCOUNT`>(`CREDIT_CARD`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<StartPaymentDraft | null>(null);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);

  useEffect(() => {
    if (!resumeFromDraft) return;
    const savedDraft = sessionStorage.getItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    if (!savedDraft) return;

    const draft = parseStoredStartPaymentDraft(savedDraft, preferredCurrency);
    if (draft) {
      setEmail(draft.email);
      setAmount(draft.amount);
      setCurrencyCode(draft.currencyCode);
      setDescription(draft.description);
      setMethod(draft.method);
      sessionStorage.removeItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    } else {
      sessionStorage.removeItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    }
  }, [preferredCurrency, resumeFromDraft]);

  async function submitStartPayment(draft: StartPaymentDraft) {
    const result = await startPaymentMutation({
      ...draft,
      contractId: paymentFlowContext?.contractId,
      returnTo: paymentFlowContext?.returnTo,
    });
    if (!result.ok) {
      if (handleSessionExpiredError(result.error)) return false;
      setMessage({ type: `error`, text: result.error.message });
      return false;
    }
    setMessage({ type: `success`, text: result.message ?? `Payment created` });
    router.push(getStartPaymentResultHref(result.paymentRequestId, paymentFlowContext));
    return true;
  }

  async function handleSubmit() {
    setMessage(null);
    const normalizedEmail = normalizeEmail(email);
    const numericAmount = Number(amount);
    const normalizedCurrencyCode = currencyCode.trim().toUpperCase();

    if (!normalizedEmail || !normalizedEmail.includes(`@`)) {
      setMessage({ type: `error`, text: `Please enter a valid recipient email.` });
      return;
    }
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setMessage({ type: `error`, text: `Please enter a valid amount.` });
      return;
    }
    if (!normalizedCurrencyCode || normalizedCurrencyCode.length !== 3) {
      setMessage({ type: `error`, text: `Please choose a valid currency.` });
      return;
    }

    const draft: StartPaymentDraft = {
      email: normalizedEmail,
      amount,
      currencyCode: normalizedCurrencyCode,
      description: description.trim(),
      method,
    };

    setIsSubmitting(true);
    try {
      const knownContactResult = await hasSavedContactByEmailQuery(normalizedEmail);
      if (!knownContactResult.ok) {
        if (handleSessionExpiredError(knownContactResult.error)) return;
        setMessage({ type: `error`, text: knownContactResult.error.message });
        return;
      }

      if (!knownContactResult.found) {
        setPendingDraft(draft);
        setConfirmOpen(true);
        return;
      }

      await submitStartPayment(draft);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueWithoutAdding() {
    if (!pendingDraft) return;
    setIsConfirmLoading(true);
    setMessage(null);
    try {
      const done = await submitStartPayment(pendingDraft);
      if (done) {
        setConfirmOpen(false);
      }
    } finally {
      setIsConfirmLoading(false);
    }
  }

  async function addAndContinue() {
    if (!pendingDraft) return;
    setIsConfirmLoading(true);
    setMessage(null);
    try {
      const createContactResult = await createContactMutation({ email: pendingDraft.email });
      if (!createContactResult.ok) {
        if (handleSessionExpiredError(createContactResult.error)) return;
        setMessage({ type: `error`, text: createContactResult.error.message });
        return;
      }

      const done = await submitStartPayment(pendingDraft);
      if (done) {
        setConfirmOpen(false);
      }
    } finally {
      setIsConfirmLoading(false);
    }
  }

  function addFullContact() {
    if (!pendingDraft) return;
    sessionStorage.setItem(START_PAYMENT_DRAFT_STORAGE_KEY, JSON.stringify(pendingDraft));
    setConfirmOpen(false);
    router.push(buildUnknownRecipientContactsUrl(pendingDraft.email, paymentFlowContext));
  }

  return (
    <div className="space-y-5">
      <Panel title="Start payment" aside="Payer initiated">
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            Create a one-off payment to a contractor or client without waiting for a payment request. The payment detail
            flow will keep the selected settlement currency.
          </div>

          {message ? (
            <div
              className={
                message.type === `error`
                  ? `rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200`
                  : `rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200`
              }
            >
              {message.text}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-white/55" htmlFor="start-payment-email">
                Recipient email
              </label>
              <input
                id="start-payment-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage(null);
                }}
                placeholder="recipient@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
              <div className="mt-2 text-sm text-white/45">
                We will create a payer-side payment draft for this recipient.
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="start-payment-amount">
                Amount
              </label>
              <input
                id="start-payment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setMessage(null);
                }}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="start-payment-currency">
                Currency
              </label>
              <select
                id="start-payment-currency"
                value={currencyCode}
                onChange={(event) => {
                  setCurrencyCode(event.target.value);
                  setMessage(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="start-payment-method">
                Payment method
              </label>
              <select
                id="start-payment-method"
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value === `BANK_ACCOUNT` ? `BANK_ACCOUNT` : `CREDIT_CARD`);
                  setMessage(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="BANK_ACCOUNT">Bank Account</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-white/55" htmlFor="start-payment-description">
                Description
              </label>
              <textarea
                id="start-payment-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setMessage(null);
                }}
                placeholder="Optional payment note"
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSubmitting || isConfirmLoading}
              onClick={() => {
                void handleSubmit();
              }}
              className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? `Processing...` : `Send payment`}
            </button>
            <button
              type="button"
              disabled={isSubmitting || isConfirmLoading}
              onClick={() => {
                setEmail(initialEmail);
                setAmount(``);
                setCurrencyCode(preferredCurrency || `USD`);
                setDescription(``);
                setMethod(`CREDIT_CARD`);
                setMessage(null);
              }}
              className="rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="How unknown recipients work">
        <div className="space-y-3 text-sm text-white/65">
          <p>
            If the recipient email is not already saved in your contacts, the app will ask whether you want to continue
            immediately, add the email as a lightweight contact, or jump to the full contacts page.
          </p>
          <p>That keeps the old start-payment safety net while staying inside the css-grid shell.</p>
        </div>
      </Panel>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#09162f] p-5 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">This email is not in your contacts yet</h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              You can continue right away, add a lightweight contact and continue, or open the full contacts page and
              come back to this draft.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={() => {
                  void continueWithoutAdding();
                }}
                className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConfirmLoading ? `Working...` : `Continue anyway`}
              </button>
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={() => {
                  void addAndContinue();
                }}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add contact and continue
              </button>
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={addFullContact}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add full contact
              </button>
            </div>

            <button
              type="button"
              disabled={isConfirmLoading}
              onClick={() => setConfirmOpen(false)}
              className="mt-4 text-sm text-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
