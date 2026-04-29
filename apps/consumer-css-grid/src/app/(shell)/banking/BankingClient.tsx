'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { BankAccountForm } from './BankAccountForm';
import {
  getBankFormValidity,
  getCardFormValidity,
  getPaymentMethodSections,
  initialBankForm,
  initialCardForm,
  type PaymentMethod,
} from './banking-form-helpers';
import { BankingSummary } from './BankingSummary';
import { ManualCardForm } from './ManualCardForm';
import { ReusableCardSetupPanel } from './ReusableCardSetupPanel';
import { SavedPaymentMethodsList } from './SavedPaymentMethodsList';
import {
  addBankAccountMutation,
  addCardMutation,
  deletePaymentMethodMutation,
  setDefaultPaymentMethodMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Panel } from '../../../shared/ui/shell-primitives';

type Props = {
  accounts: PaymentMethod[];
};

type Message = {
  type: `error` | `success`;
  text: string;
} | null;

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
  const [bankForm, setBankForm] = useState(initialBankForm);
  const [cardForm, setCardForm] = useState(initialCardForm);

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

  const bankValidity = getBankFormValidity(bankForm);
  const cardValidity = getCardFormValidity(cardForm);
  const sections = getPaymentMethodSections(bankAccounts, manualCards, reusableCards);

  const handleSetDefault = (account: PaymentMethod) => {
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
  };

  const handleDelete = (account: PaymentMethod) => {
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
  };

  const handleAddBankAccount = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await addBankAccountMutation(bankForm);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      setBankForm(initialBankForm);
      setMessage({ type: `success`, text: result.message ?? `Bank account added` });
      router.refresh();
    });
  };

  const handleAddCard = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await addCardMutation(cardForm);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      setCardForm(initialCardForm);
      setMessage({ type: `success`, text: result.message ?? `Card added` });
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <BankingSummary
        accountsCount={accounts.length}
        defaultBankAccount={defaultBankAccount}
        defaultCard={defaultCard}
        reusableCardsCount={reusableCards.length}
      />

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

          <SavedPaymentMethodsList
            accountsCount={accounts.length}
            isPending={isPending}
            pendingActionId={pendingActionId}
            sections={sections}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
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
              <BankAccountForm
                emailValid={bankValidity.emailValid}
                form={bankForm}
                formValid={bankValidity.formValid}
                isPending={isPending}
                phoneValid={bankValidity.phoneValid}
                onChange={setBankForm}
                onSubmit={handleAddBankAccount}
              />
            ) : activeForm === `manualCard` ? (
              <ManualCardForm
                emailValid={cardValidity.emailValid}
                expired={cardValidity.expired}
                form={cardForm}
                formValid={cardValidity.formValid}
                isPending={isPending}
                phoneValid={cardValidity.phoneValid}
                onChange={setCardForm}
                onSubmit={handleAddCard}
              />
            ) : (
              <ReusableCardSetupPanel onMessage={setMessage} />
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
