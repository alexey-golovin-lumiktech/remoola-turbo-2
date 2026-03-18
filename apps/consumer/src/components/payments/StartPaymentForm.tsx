'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODE, emailSchema, isCurrencyCode, type TCurrencyCode } from '@remoola/api-types';

import { createContactRequest } from '../../lib/create-contact';
import { getErrorMessageForUser } from '../../lib/error-messages';
import {
  continueWithUnknownRecipient,
  hasContactForEmail,
  normalizeEmail,
} from '../../lib/payment-request-recipient-flow';
import { type ConsumerContact } from '../../types';
import { AmountCurrencyInput, FormField, FormSelect, RecipientEmailField, type FormSelectOption } from '../ui';
import styles from '../ui/classNames.module.css';

const {
  buttonDisabledOpacity,
  buttonPrimaryRoundedCompact,
  formFieldSpacing,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentLg,
  modalOverlayClass,
  modalParagraphClass,
  modalTitleClass,
  spaceY4,
} = styles;

const PAYMENT_METHOD_OPTIONS: FormSelectOption[] = [
  { value: `CREDIT_CARD`, label: `Credit Card` },
  { value: `BANK_ACCOUNT`, label: `Bank Account` },
];

const START_PAYMENT_DRAFT_STORAGE_KEY = `start-payment-draft`;

type StartPaymentPayload = {
  email: string;
  amount: string;
  currencyCode: TCurrencyCode;
  description: string;
  method: `CREDIT_CARD` | `BANK_ACCOUNT`;
};

export function StartPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(CURRENCY_CODE.USD);
  const [defaultCurrencyLoaded, setDefaultCurrencyLoaded] = useState(false);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState<`CREDIT_CARD` | `BANK_ACCOUNT`>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<StartPaymentPayload | null>(null);
  const [pendingEmail, setPendingEmail] = useState(``);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (defaultCurrencyLoaded) return;
    let cancelled = false;
    fetch(`/api/settings`, { credentials: `include`, cache: `no-store` })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredCurrency?: TCurrencyCode | null } | null) => {
        if (cancelled || !data?.preferredCurrency) return;
        if (isCurrencyCode(data.preferredCurrency)) {
          setCurrencyCode(data.preferredCurrency);
        }
      })
      .finally(() => setDefaultCurrencyLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [defaultCurrencyLoaded]);

  useEffect(() => {
    if (searchParams.get(`resumeStartPayment`) !== `1`) return;

    const saved = sessionStorage.getItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    if (!saved) return;

    try {
      const draft = JSON.parse(saved) as {
        email?: string;
        amount?: string;
        currencyCode?: TCurrencyCode;
        description?: string;
        method?: `CREDIT_CARD` | `BANK_ACCOUNT`;
      };

      setEmail(draft.email ?? ``);
      setAmount(draft.amount ?? ``);
      setCurrencyCode(draft.currencyCode ?? CURRENCY_CODE.USD);
      setDescription(draft.description ?? ``);
      setMethod(draft.method ?? `CREDIT_CARD`);
      sessionStorage.removeItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(START_PAYMENT_DRAFT_STORAGE_KEY);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!actionsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!actionsMenuRef.current) return;
      if (actionsMenuRef.current.contains(event.target as Node)) return;
      setActionsOpen(false);
    }

    window.addEventListener(`mousedown`, handleClickOutside);
    return () => {
      window.removeEventListener(`mousedown`, handleClickOutside);
    };
  }, [actionsOpen]);

  useEffect(() => {
    if (!confirmOpen) {
      setActionsOpen(false);
    }
  }, [confirmOpen]);

  async function loadContacts(): Promise<ConsumerContact[]> {
    const res = await fetch(`/api/contacts`, {
      method: `GET`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      cache: `no-store`,
    });
    if (!res.ok) {
      throw new Error(`Unable to load contacts`);
    }
    const data = await res.json();
    return data.items ?? [];
  }

  async function doStartPayment(payload: StartPaymentPayload): Promise<void> {
    const res = await fetch(`/api/payments/start`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/payments/${data.paymentRequestId}`);
      return;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Payment failed`);
  }

  async function submit() {
    const emailParsed = emailSchema.safeParse(email.trim());
    if (!emailParsed.success) {
      toast.error(emailParsed.error.issues[0]?.message ?? `Please enter recipient email.`);
      return;
    }
    const normalized = normalizeEmail(emailParsed.data);
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(`Please enter a valid amount.`);
      return;
    }

    setLoading(true);

    const payload: StartPaymentPayload = {
      email: normalized,
      amount,
      currencyCode,
      description,
      method,
    };

    try {
      const contacts = await loadContacts();
      const emailExists = hasContactForEmail(contacts, normalized);

      if (!emailExists) {
        setPendingPayload(payload);
        setPendingEmail(normalized);
        setConfirmOpen(true);
        setLoading(false);
        return;
      }

      await doStartPayment(payload);
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Payment failed`;
      toast.error(getErrorMessageForUser(raw, `We couldn't send the payment. Please try again.`));
    } finally {
      setLoading(false);
    }
  }

  async function continueWithoutAdding() {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    try {
      await doStartPayment(pendingPayload);
      setConfirmOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Payment failed`;
      toast.error(getErrorMessageForUser(raw, `We couldn't send the payment. Please try again.`));
    } finally {
      setConfirmLoading(false);
    }
  }

  async function addAndContinue() {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    try {
      await continueWithUnknownRecipient({
        addToContacts: true,
        createContactAction: async () => {
          const response = await createContactRequest({
            email: pendingEmail,
            name: null,
            address: {
              postalCode: null,
              country: null,
              state: null,
              city: null,
              street: null,
            },
          });
          const parsed = JSON.parse((await response.text()) || `{}`);
          return {
            ok: response.ok,
            status: response.status,
            message: String(parsed?.message ?? response.statusText ?? ``),
          };
        },
        createPaymentRequestAction: async () => {
          await doStartPayment(pendingPayload);
        },
      });
      setConfirmOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to continue`;
      toast.error(getErrorMessageForUser(raw, `We couldn't add the contact or send the payment. Please try again.`));
    } finally {
      setConfirmLoading(false);
    }
  }

  function addFullContact() {
    if (!pendingPayload) return;

    sessionStorage.setItem(
      START_PAYMENT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        email: pendingPayload.email,
        amount,
        currencyCode,
        description,
        method,
      }),
    );

    setConfirmOpen(false);
    const returnTo = `/payments/start?resumeStartPayment=1`;
    router.push(
      `/contacts?create=1&email=${encodeURIComponent(pendingEmail)}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={spaceY4}
    >
      <RecipientEmailField
        label="Recipient Email"
        description="We'll send the payment to this address. They can pay with card or bank."
        value={email}
        onChange={setEmail}
        required
      />

      <AmountCurrencyInput
        amount={amount}
        onAmountChange={setAmount}
        currencyCode={currencyCode}
        onCurrencyChange={setCurrencyCode}
        required
        placeholder="0.00"
      />

      <FormField label="Description">
        <textarea
          className={formFieldSpacing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormSelect
        label="Payment Method"
        value={method}
        onChange={(v) => setMethod(v as `CREDIT_CARD` | `BANK_ACCOUNT`)}
        options={PAYMENT_METHOD_OPTIONS}
        placeholder="Select payment method..."
        isClearable={false}
      />

      <button
        disabled={loading || confirmLoading}
        className={`
          ${buttonPrimaryRoundedCompact}
          ${buttonDisabledOpacity}
        `}
      >
        {loading ? `Processing...` : `Send Payment`}
      </button>

      {confirmOpen && (
        <div className={modalOverlayClass}>
          <div
            className={`
              ${modalContentLg}
              ${spaceY4}
            `}
          >
            <h2 className={modalTitleClass}>This email isn&apos;t in your contacts. Add it automatically?</h2>
            <p className={modalParagraphClass}>
              You can add this contact now, or continue without adding it and still send the payment.
            </p>
            <div
              className={`
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
                pt-4
              `}
            >
              <div
                className={`
                  flex
                  flex-wrap
                  gap-2
                `}
              >
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className={`
                    ${modalButtonSecondary}
                    whitespace-nowrap
                  `}
                  disabled={confirmLoading}
                >
                  Cancel
                </button>
              </div>
              <div
                ref={actionsMenuRef}
                className={`
                  relative
                `}
              >
                <div
                  className={`
                    flex
                    items-center
                    gap-2
                  `}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void continueWithoutAdding();
                    }}
                    className={`
                      ${modalButtonPrimary}
                      whitespace-nowrap
                    `}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? `Working...` : `Continue`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionsOpen((open) => !open)}
                    className={`
                      ${modalButtonSecondary}
                      inline-flex
                      items-center
                      gap-1
                      whitespace-nowrap
                    `}
                    disabled={confirmLoading}
                  >
                    More Actions
                    <span aria-hidden>{actionsOpen ? `▴` : `▾`}</span>
                  </button>
                </div>
                {actionsOpen && (
                  <div
                    className={`
                      absolute
                      bottom-full
                      right-0
                      z-10
                      min-w-[18rem]
                      mb-2
                      overflow-hidden
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      shadow-2xl
                      dark:border-slate-600
                      dark:bg-slate-800
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        void addAndContinue();
                      }}
                      className={`
                        block
                        w-full
                        px-4
                        py-2.5
                        text-left
                        text-sm
                        font-medium
                        text-gray-900
                        hover:bg-gray-100
                        dark:text-gray-100
                        dark:hover:bg-slate-700
                      `}
                      disabled={confirmLoading}
                    >
                      Add Contact and Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        addFullContact();
                      }}
                      className={`
                        block
                        w-full
                        border-t
                        border-gray-200
                        px-4
                        py-2.5
                        text-left
                        text-sm
                        font-medium
                        text-gray-900
                        hover:bg-gray-100
                        dark:border-slate-700
                        dark:text-gray-100
                        dark:hover:bg-slate-700
                      `}
                      disabled={confirmLoading}
                    >
                      Add Full Contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
