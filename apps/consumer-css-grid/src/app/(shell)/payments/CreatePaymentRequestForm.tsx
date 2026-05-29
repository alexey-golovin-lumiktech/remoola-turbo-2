'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition } from 'react';

import { CURRENCY_CODES } from '@remoola/api-types';

import { buildPaymentDetailHref, type PaymentFlowContext } from './payment-flow-context';
import { getTodayDateInputValue, isDateInputTodayOrLater } from '../../../lib/date-input';
import { createPaymentRequestMutation } from '../../../lib/mutations/payments.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';

export type CreatePaymentRequestFormProps = {
  contacts: Array<{ id: string; email: string; name?: string }>;
  currencies: string[];
  preferredCurrency?: string;
  initialEmail?: string;
  paymentFlowContext?: PaymentFlowContext | null;
  onSuccess?: (paymentRequestId: string) => void;
  className?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCurrencyList(currencies: string[], preferredCurrency?: string) {
  const normalized = Array.from(
    new Set(currencies.map((currency) => currency.trim().toUpperCase()).filter((currency) => currency.length === 3)),
  );
  const preferred = preferredCurrency?.trim().toUpperCase();
  if (preferred && preferred.length === 3 && !normalized.includes(preferred)) {
    normalized.unshift(preferred);
  }
  return normalized.length > 0 ? normalized : [...CURRENCY_CODES];
}

function defaultCurrencyFor(currencies: readonly string[], preferredCurrency?: string) {
  const preferred = preferredCurrency?.trim().toUpperCase();
  if (preferred && currencies.includes(preferred)) {
    return preferred;
  }
  return currencies[0] ?? `USD`;
}

export function CreatePaymentRequestForm({
  contacts,
  currencies,
  preferredCurrency,
  initialEmail = ``,
  paymentFlowContext,
  onSuccess,
  className,
}: CreatePaymentRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const availableCurrencies = useMemo(
    () => normalizeCurrencyList(currencies, preferredCurrency),
    [currencies, preferredCurrency],
  );
  const defaultCurrency = useMemo(
    () => defaultCurrencyFor(availableCurrencies, preferredCurrency),
    [availableCurrencies, preferredCurrency],
  );
  const savedContacts = useMemo(
    () =>
      Array.from(
        new Map(
          contacts
            .map((contact) => {
              const email = contact.email.trim().toLowerCase();
              if (!email) return null;
              return [
                email,
                {
                  id: contact.id,
                  email,
                  ...(contact.name?.trim() ? { name: contact.name.trim() } : {}),
                },
              ] as const;
            })
            .filter(
              (contact): contact is readonly [string, { id: string; email: string; name?: string }] => contact !== null,
            ),
        ).values(),
      ),
    [contacts],
  );
  const emailSuggestionsId = useId().replace(/:/g, `-`);
  const fieldIdPrefix = useId().replace(/:/g, `-`);

  const [email, setEmail] = useState(initialEmail);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState(defaultCurrency);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [message, setMessage] = useState<{ type: `success` | `error`; text: string } | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasValidEmail = isValidEmail(normalizedEmail);
  const matchedContact = useMemo(
    () => savedContacts.find((contact) => contact.email === normalizedEmail) ?? null,
    [normalizedEmail, savedContacts],
  );
  const hasValidDueDate = useMemo(() => {
    if (!dueDate) return true;
    return isDateInputTodayOrLater(dueDate);
  }, [dueDate]);
  const formValid = hasValidEmail && hasValidAmount && currencyCode.length === 3 && hasValidDueDate;

  const clearForm = () => {
    setEmail(initialEmail);
    setAmount(``);
    setCurrencyCode(defaultCurrency);
    setDescription(``);
    setDueDate(``);
    setMessage(null);
  };

  const submitForm = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createPaymentRequestMutation({
        email,
        amount,
        currencyCode,
        description,
        dueDate,
        contractId: paymentFlowContext?.contractId,
        returnTo: paymentFlowContext?.returnTo,
      });
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }

      setMessage({ type: `success`, text: result.message ?? `Payment request created` });
      const paymentRequestId = result.paymentRequestId?.trim();
      if (!paymentRequestId) {
        router.refresh();
        return;
      }

      if (onSuccess) {
        onSuccess(paymentRequestId);
        return;
      }

      router.push(buildPaymentDetailHref(paymentRequestId, paymentFlowContext));
    });
  };

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (!formValid || isPending) return;
        submitForm();
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm text-(--app-text-muted)"
            htmlFor={`${fieldIdPrefix}-payment-request-email`}
          >
            Recipient email
          </label>
          <input
            id={`${fieldIdPrefix}-payment-request-email`}
            type="email"
            value={email}
            list={emailSuggestionsId}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage(null);
            }}
            placeholder="recipient@example.com"
            aria-invalid={email.length > 0 && !hasValidEmail}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
          />
          <datalist id={emailSuggestionsId}>
            {savedContacts.map((contact) => (
              <option key={contact.id} value={contact.email}>
                {contact.name ? `${contact.name} (${contact.email})` : contact.email}
              </option>
            ))}
          </datalist>
          {email.length > 0 && !hasValidEmail ? (
            <div className="mt-2 text-sm text-(--app-danger-text)">Enter a valid recipient email address.</div>
          ) : matchedContact?.name ? (
            <div className="mt-2 text-sm text-(--app-success-text)">Saved contact: {matchedContact.name}</div>
          ) : savedContacts.length > 0 ? (
            <div className="mt-2 text-sm text-(--app-text-muted)">Start typing to use one of your saved contacts.</div>
          ) : (
            <div className="mt-2 text-sm text-(--app-text-muted)">
              We will notify the payer after you send the request.
            </div>
          )}
        </div>

        <div>
          <label
            className="mb-2 block text-sm text-(--app-text-muted)"
            htmlFor={`${fieldIdPrefix}-payment-request-amount`}
          >
            Amount
          </label>
          <input
            id={`${fieldIdPrefix}-payment-request-amount`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setMessage(null);
            }}
            placeholder="0.00"
            aria-invalid={amount.length > 0 && !hasValidAmount}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
          />
          {amount.length > 0 && !hasValidAmount ? (
            <div className="mt-2 text-sm text-(--app-danger-text)">Enter an amount greater than zero.</div>
          ) : (
            <div className="mt-2 text-sm text-(--app-text-muted)">Use decimal format like `125.50`.</div>
          )}
        </div>

        <div>
          <label
            className="mb-2 block text-sm text-(--app-text-muted)"
            htmlFor={`${fieldIdPrefix}-payment-request-currency`}
          >
            Currency
          </label>
          <select
            id={`${fieldIdPrefix}-payment-request-currency`}
            value={currencyCode}
            onChange={(event) => {
              setCurrencyCode(event.target.value);
              setMessage(null);
            }}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
          >
            {availableCurrencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm text-(--app-text-muted)"
            htmlFor={`${fieldIdPrefix}-payment-request-description`}
          >
            Description
          </label>
          <textarea
            id={`${fieldIdPrefix}-payment-request-description`}
            rows={3}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setMessage(null);
            }}
            placeholder="What is this payment request for?"
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
          />
        </div>

        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm text-(--app-text-muted)"
            htmlFor={`${fieldIdPrefix}-payment-request-due-date`}
          >
            Due date
          </label>
          <input
            id={`${fieldIdPrefix}-payment-request-due-date`}
            type="date"
            min={getTodayDateInputValue()}
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value);
              setMessage(null);
            }}
            aria-invalid={dueDate.length > 0 && !hasValidDueDate}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none"
          />
          {dueDate.length > 0 && !hasValidDueDate ? (
            <div className="mt-2 text-sm text-(--app-danger-text)">Choose today or a future date.</div>
          ) : (
            <div className="mt-2 text-sm text-(--app-text-muted)">Optional deadline for the payer.</div>
          )}
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            message.type === `error`
              ? `border-(--app-danger-soft) bg-(--app-danger-soft) text-(--app-danger-text)`
              : `border-(--app-success-soft) bg-(--app-success-soft) text-(--app-success-text)`
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending || !formValid}
          className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Creating...` : formValid ? `Create request draft` : `Complete request details`}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={clearForm}
          className="rounded-2xl border border-(--app-border) px-4 py-3 text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear form
        </button>
      </div>
    </form>
  );
}
