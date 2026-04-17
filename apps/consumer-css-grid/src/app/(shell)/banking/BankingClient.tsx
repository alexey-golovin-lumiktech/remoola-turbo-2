'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  digitsOnly,
  getMethodKind,
  getMethodLabel,
  getMethodMeta,
  isCardExpired,
  isValidEmail,
  normalizeEmail,
  normalizeMonth,
  normalizePhone,
  phoneDigitsCount,
} from './banking-helpers';
import { ReusableCardSetupPanel } from './ReusableCardSetupPanel';
import {
  addBankAccountMutation,
  addCardMutation,
  deletePaymentMethodMutation,
  setDefaultPaymentMethodMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { MetricCard, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

type PaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  reusableForPayerPayments: boolean;
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
};

type Props = {
  accounts: PaymentMethod[];
};

type Message = {
  type: `error` | `success`;
  text: string;
} | null;

function FieldHint({ message, tone = `muted` }: { message: string; tone?: `muted` | `error` }) {
  return (
    <div
      className={`mt-2 text-xs ${tone === `error` ? `text-[var(--app-danger-text)]` : `text-[var(--app-text-faint)]`}`}
    >
      {message}
    </div>
  );
}

function SelectorCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid gap-2 rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? `border-[var(--app-primary)]/30 bg-[var(--app-primary-soft)]`
          : `border-[color:var(--app-border)] bg-[var(--app-surface-muted)] hover:border-[var(--app-primary)]/20`
      }`}
    >
      <div className="font-medium text-[var(--app-text)]">{title}</div>
      <div className="text-sm leading-6 text-[var(--app-text-muted)]">{description}</div>
    </button>
  );
}

export function BankingClient({ accounts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeForm, setActiveForm] = useState<`bank` | `manualCard` | `reusableCard`>(`bank`);
  const [message, setMessage] = useState<Message>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: ``,
    last4: ``,
    billingName: ``,
    billingEmail: ``,
    billingPhone: ``,
    defaultSelected: true,
  });
  const [cardForm, setCardForm] = useState({
    brand: ``,
    last4: ``,
    expMonth: ``,
    expYear: ``,
    billingName: ``,
    billingEmail: ``,
    billingPhone: ``,
    defaultSelected: true,
  });

  const bankAccounts = useMemo(() => accounts.filter((method) => method.type === `BANK_ACCOUNT`), [accounts]);
  const manualCards = useMemo(
    () => accounts.filter((method) => method.type === `CREDIT_CARD` && !method.reusableForPayerPayments),
    [accounts],
  );
  const reusableCards = useMemo(
    () => accounts.filter((method) => method.type === `CREDIT_CARD` && method.reusableForPayerPayments),
    [accounts],
  );
  const defaultBankAccount = useMemo(
    () => bankAccounts.find((method) => method.defaultSelected) ?? null,
    [bankAccounts],
  );
  const defaultCard = useMemo(
    () => accounts.find((method) => method.type === `CREDIT_CARD` && method.defaultSelected) ?? null,
    [accounts],
  );

  const bankEmailValid = bankForm.billingEmail.length === 0 || isValidEmail(bankForm.billingEmail);
  const bankPhoneValid = bankForm.billingPhone.length === 0 || phoneDigitsCount(bankForm.billingPhone) >= 7;
  const bankFormValid =
    bankForm.bankName.trim().length > 0 &&
    /^\d{4}$/.test(bankForm.last4) &&
    bankForm.billingName.trim().length > 0 &&
    bankEmailValid &&
    bankPhoneValid;

  const cardEmailValid = cardForm.billingEmail.length === 0 || isValidEmail(cardForm.billingEmail);
  const cardPhoneValid = cardForm.billingPhone.length === 0 || phoneDigitsCount(cardForm.billingPhone) >= 7;
  const cardExpired = isCardExpired(cardForm.expMonth, cardForm.expYear);
  const cardFormValid =
    cardForm.brand.trim().length > 0 &&
    /^\d{4}$/.test(cardForm.last4) &&
    /^(0[1-9]|1[0-2])$/.test(cardForm.expMonth) &&
    /^\d{4}$/.test(cardForm.expYear) &&
    !cardExpired &&
    cardForm.billingName.trim().length > 0 &&
    cardEmailValid &&
    cardPhoneValid;

  const sections = [
    {
      id: `bank-accounts`,
      title: `Bank accounts`,
      description: `Used for payouts and manual Banking records.`,
      items: bankAccounts,
      emptyText: `No bank accounts saved yet.`,
    },
    {
      id: `manual-cards`,
      title: `Manual card records`,
      description: `Billing and display metadata only. These do not power one-click payer payments.`,
      items: manualCards,
      emptyText: `No manual Banking card records saved yet.`,
    },
    {
      id: `reusable-cards`,
      title: `Reusable Stripe cards`,
      description: `Saved with Stripe for one-click payer payments and still visible in Banking.`,
      items: reusableCards,
      emptyText: `No reusable payer cards saved yet.`,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="◈" label="Accounts" value={String(accounts.length)} sublabel="Connected methods" />
        <MetricCard
          icon="★"
          label="Default bank"
          value={defaultBankAccount ? getMethodLabel(defaultBankAccount) : `—`}
          sublabel="Type-scoped bank default"
        />
        <MetricCard
          icon="✦"
          label="Default card"
          value={defaultCard ? getMethodLabel(defaultCard) : `—`}
          sublabel="Shared across manual and reusable cards"
        />
        <MetricCard
          icon="⟳"
          label="Reusable payer cards"
          value={String(reusableCards.length)}
          sublabel="Available for one-click payer payments"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel title="Saved banking methods" aside="Truthful method labels">
          {message ? (
            <div
              className={
                message.type === `error`
                  ? `mb-4 rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]`
                  : `mb-4 rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]`
              }
            >
              {message.text}
            </div>
          ) : null}

          {accounts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              No payment methods connected yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {sections.map((section) => (
                <div key={section.id} className="grid gap-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium text-[var(--app-text)]">{section.title}</div>
                    <div className="text-sm text-[var(--app-text-muted)]">{section.description}</div>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm text-[var(--app-text-muted)]">
                      {section.emptyText}
                    </div>
                  ) : (
                    section.items.map((account) => {
                      const kind = getMethodKind(account);

                      return (
                        <div
                          key={account.id}
                          className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                        >
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                            <div className="grid gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs ${kind.tone}`}>
                                  {kind.label}
                                </span>
                                <StatusPill status={account.defaultSelected ? `Default` : `Connected`} />
                              </div>
                              <div className="font-medium text-[var(--app-text)]">{getMethodLabel(account)}</div>
                              <div className="text-sm text-[var(--app-text-muted)]">{getMethodMeta(account)}</div>
                              <div className="text-sm text-[var(--app-text-soft)]">{kind.detail}</div>
                              {account.billingDetails?.name ? (
                                <div className="text-sm text-[var(--app-text-faint)]">
                                  Billing: {account.billingDetails.name}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <button
                                type="button"
                                disabled={isPending || account.defaultSelected}
                                onClick={() => {
                                  setMessage(null);
                                  setPendingActionId(`default:${account.id}`);
                                  startTransition(async () => {
                                    const result = await setDefaultPaymentMethodMutation(account.id);
                                    setPendingActionId(null);
                                    if (!result.ok) {
                                      if (handleSessionExpiredError(result.error)) return;
                                      setMessage({ type: `error`, text: result.error.message });
                                      return;
                                    }
                                    setMessage({ type: `success`, text: result.message ?? `Default updated` });
                                    router.refresh();
                                  });
                                }}
                                className="rounded-2xl border border-[var(--app-primary)]/20 px-3 py-2 text-sm text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {pendingActionId === `default:${account.id}`
                                  ? `Updating...`
                                  : account.defaultSelected
                                    ? `Default`
                                    : `Set default`}
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setMessage(null);
                                  setPendingActionId(`delete:${account.id}`);
                                  startTransition(async () => {
                                    const result = await deletePaymentMethodMutation(account.id);
                                    setPendingActionId(null);
                                    if (!result.ok) {
                                      if (handleSessionExpiredError(result.error)) return;
                                      setMessage({ type: `error`, text: result.error.message });
                                      return;
                                    }
                                    setMessage({ type: `success`, text: result.message ?? `Payment method deleted` });
                                    router.refresh();
                                  });
                                }}
                                className="rounded-2xl border border-[var(--app-danger-text)]/20 px-3 py-2 text-sm text-[var(--app-danger-text)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {pendingActionId === `delete:${account.id}` ? `Deleting...` : `Delete`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Add payment method" aside="Choose the truthful path">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SelectorCard
                active={activeForm === `bank`}
                title="Bank account"
                description="Add a payout destination with bank label, last 4 digits, and billing details."
                onClick={() => {
                  setActiveForm(`bank`);
                  setMessage(null);
                }}
              />
              <SelectorCard
                active={activeForm === `manualCard`}
                title="Manual card record"
                description="Keep Banking metadata only. This does not create a reusable payer card."
                onClick={() => {
                  setActiveForm(`manualCard`);
                  setMessage(null);
                }}
              />
              <SelectorCard
                active={activeForm === `reusableCard`}
                title="Add reusable card"
                description="Save a Stripe-backed card that can be used for one-click payer payments."
                onClick={() => {
                  setActiveForm(`reusableCard`);
                  setMessage(null);
                }}
              />
            </div>

            {activeForm === `bank` ? (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--app-text-soft)]">
                  Bank accounts saved here keep the bank label, last 4 digits, and billing details. Full routing and
                  account numbers are not stored on this Banking surface.
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-name">
                    Bank name
                  </label>
                  <input
                    id="bank-name"
                    value={bankForm.bankName}
                    onChange={(event) => setBankForm((current) => ({ ...current, bankName: event.target.value }))}
                    placeholder="Bank name"
                    className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-last4">
                    Last 4 digits
                  </label>
                  <input
                    id="bank-last4"
                    value={bankForm.last4}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) =>
                      setBankForm((current) => ({ ...current, last4: digitsOnly(event.target.value, 4) }))
                    }
                    placeholder="Last 4 digits"
                    aria-invalid={bankForm.last4.length > 0 && bankForm.last4.length !== 4}
                    className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                  />
                  {bankForm.last4.length > 0 ? (
                    <FieldHint
                      message={
                        bankForm.last4.length === 4
                          ? `Looks good.`
                          : `${4 - bankForm.last4.length} more digit${bankForm.last4.length === 3 ? `` : `s`} needed.`
                      }
                      tone={bankForm.last4.length === 4 ? `muted` : `error`}
                    />
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-name">
                    Billing name
                  </label>
                  <input
                    id="bank-billing-name"
                    value={bankForm.billingName}
                    onChange={(event) => setBankForm((current) => ({ ...current, billingName: event.target.value }))}
                    placeholder="Billing name"
                    className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-email">
                      Billing email
                    </label>
                    <input
                      id="bank-billing-email"
                      type="email"
                      value={bankForm.billingEmail}
                      onChange={(event) =>
                        setBankForm((current) => ({ ...current, billingEmail: normalizeEmail(event.target.value) }))
                      }
                      placeholder="Billing email"
                      aria-invalid={!bankEmailValid}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                    {bankForm.billingEmail.length > 0 ? (
                      <FieldHint
                        message={bankEmailValid ? `Email will be saved in lowercase.` : `Enter a valid email address.`}
                        tone={bankEmailValid ? `muted` : `error`}
                      />
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-phone">
                      Billing phone
                    </label>
                    <input
                      id="bank-billing-phone"
                      value={bankForm.billingPhone}
                      inputMode="tel"
                      onChange={(event) =>
                        setBankForm((current) => ({ ...current, billingPhone: normalizePhone(event.target.value) }))
                      }
                      placeholder="Billing phone"
                      aria-invalid={!bankPhoneValid}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                    {bankForm.billingPhone.length > 0 ? (
                      <FieldHint
                        message={
                          bankPhoneValid
                            ? `Phone is stored as digits with optional leading +.`
                            : `Enter at least 7 digits.`
                        }
                        tone={bankPhoneValid ? `muted` : `error`}
                      />
                    ) : null}
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm text-[var(--app-text-soft)]">
                  <input
                    type="checkbox"
                    checked={bankForm.defaultSelected}
                    onChange={(event) =>
                      setBankForm((current) => ({ ...current, defaultSelected: event.target.checked }))
                    }
                  />
                  Make this the default payout method
                </label>
                <button
                  type="button"
                  disabled={isPending || !bankFormValid}
                  onClick={() => {
                    setMessage(null);
                    startTransition(async () => {
                      const result = await addBankAccountMutation(bankForm);
                      if (!result.ok) {
                        if (handleSessionExpiredError(result.error)) return;
                        setMessage({ type: `error`, text: result.error.message });
                        return;
                      }
                      setBankForm({
                        bankName: ``,
                        last4: ``,
                        billingName: ``,
                        billingEmail: ``,
                        billingPhone: ``,
                        defaultSelected: true,
                      });
                      setMessage({ type: `success`, text: result.message ?? `Bank account added` });
                      router.refresh();
                    });
                  }}
                  className="w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? `Saving...` : bankFormValid ? `Add bank account` : `Complete bank account details`}
                </button>
              </div>
            ) : activeForm === `manualCard` ? (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--app-text-soft)]">
                  Manual card records keep brand, last 4, expiry, and billing details in Banking. They do not create a
                  reusable Stripe card for one-click payer payments.
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-brand">
                    Card brand
                  </label>
                  <input
                    id="card-brand"
                    value={cardForm.brand}
                    onChange={(event) => setCardForm((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Card brand"
                    className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-last4">
                      Last 4
                    </label>
                    <input
                      id="card-last4"
                      value={cardForm.last4}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(event) =>
                        setCardForm((current) => ({ ...current, last4: digitsOnly(event.target.value, 4) }))
                      }
                      placeholder="Last 4"
                      aria-invalid={cardForm.last4.length > 0 && cardForm.last4.length !== 4}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-exp-month">
                      Exp. month
                    </label>
                    <input
                      id="card-exp-month"
                      value={cardForm.expMonth}
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(event) =>
                        setCardForm((current) => ({ ...current, expMonth: normalizeMonth(event.target.value) }))
                      }
                      placeholder="MM"
                      aria-invalid={cardForm.expMonth.length > 0 && !/^(0[1-9]|1[0-2])$/.test(cardForm.expMonth)}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-exp-year">
                      Exp. year
                    </label>
                    <input
                      id="card-exp-year"
                      value={cardForm.expYear}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(event) =>
                        setCardForm((current) => ({ ...current, expYear: digitsOnly(event.target.value, 4) }))
                      }
                      placeholder="YYYY"
                      aria-invalid={(cardForm.expYear.length > 0 && !/^\d{4}$/.test(cardForm.expYear)) || cardExpired}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                  </div>
                </div>
                <FieldHint
                  message={
                    cardExpired
                      ? `Expiry date cannot be in the past.`
                      : `Manual card values are stored as Banking metadata only.`
                  }
                  tone={cardExpired ? `error` : `muted`}
                />
                <div>
                  <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-name">
                    Billing name
                  </label>
                  <input
                    id="card-billing-name"
                    value={cardForm.billingName}
                    onChange={(event) => setCardForm((current) => ({ ...current, billingName: event.target.value }))}
                    placeholder="Billing name"
                    className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-email">
                      Billing email
                    </label>
                    <input
                      id="card-billing-email"
                      type="email"
                      value={cardForm.billingEmail}
                      onChange={(event) =>
                        setCardForm((current) => ({ ...current, billingEmail: normalizeEmail(event.target.value) }))
                      }
                      placeholder="Billing email"
                      aria-invalid={!cardEmailValid}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                    {cardForm.billingEmail.length > 0 ? (
                      <FieldHint
                        message={cardEmailValid ? `Email will be saved in lowercase.` : `Enter a valid email address.`}
                        tone={cardEmailValid ? `muted` : `error`}
                      />
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-phone">
                      Billing phone
                    </label>
                    <input
                      id="card-billing-phone"
                      value={cardForm.billingPhone}
                      inputMode="tel"
                      onChange={(event) =>
                        setCardForm((current) => ({ ...current, billingPhone: normalizePhone(event.target.value) }))
                      }
                      placeholder="Billing phone"
                      aria-invalid={!cardPhoneValid}
                      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
                    />
                    {cardForm.billingPhone.length > 0 ? (
                      <FieldHint
                        message={
                          cardPhoneValid
                            ? `Phone is stored as digits with optional leading +.`
                            : `Enter at least 7 digits.`
                        }
                        tone={cardPhoneValid ? `muted` : `error`}
                      />
                    ) : null}
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm text-[var(--app-text-soft)]">
                  <input
                    type="checkbox"
                    checked={cardForm.defaultSelected}
                    onChange={(event) =>
                      setCardForm((current) => ({ ...current, defaultSelected: event.target.checked }))
                    }
                  />
                  Make this the default card in Banking
                </label>
                <FieldHint message="Card defaults stay type-scoped across both manual and reusable card entries." />
                <button
                  type="button"
                  disabled={isPending || !cardFormValid}
                  onClick={() => {
                    setMessage(null);
                    startTransition(async () => {
                      const result = await addCardMutation(cardForm);
                      if (!result.ok) {
                        if (handleSessionExpiredError(result.error)) return;
                        setMessage({ type: `error`, text: result.error.message });
                        return;
                      }
                      setCardForm({
                        brand: ``,
                        last4: ``,
                        expMonth: ``,
                        expYear: ``,
                        billingName: ``,
                        billingEmail: ``,
                        billingPhone: ``,
                        defaultSelected: true,
                      });
                      setMessage({ type: `success`, text: result.message ?? `Card added` });
                      router.refresh();
                    });
                  }}
                  className="w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? `Saving...` : cardFormValid ? `Add manual card record` : `Complete manual card details`}
                </button>
              </div>
            ) : (
              <ReusableCardSetupPanel onMessage={setMessage} />
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
