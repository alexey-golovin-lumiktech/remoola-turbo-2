'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { createContactRequest } from '../../lib/create-contact';
import {
  continueWithUnknownRecipient,
  hasContactForEmail,
  normalizeEmail,
} from '../../lib/payment-request-recipient-flow';
import { type ConsumerContact, type CreatePaymentRequestPayload } from '../../types';
import { DateInput, FormField, FormSelect, type FormSelectOption } from '../ui';
import styles from '../ui/classNames.module.css';

/** Restrict input to monetary format: digits, optional one decimal, max 2 decimal places. */
function maskMonetary(value: string): string {
  const digitsAndDot = value.replace(/[^\d.]/g, ``);
  const parts = digitsAndDot.split(`.`);
  if (parts.length > 2) return (parts[0] ?? ``) + `.` + parts.slice(1).join(``).slice(0, 2);
  if (parts.length === 2) return (parts[0] ?? ``) + `.` + (parts[1] ?? ``).slice(0, 2);
  return digitsAndDot;
}

/** Format raw amount for display with thousand separators and 2 decimals (e.g. 1234.56 → "1,234.56"). */
function formatMonetaryDisplay(raw: string): string {
  if (raw === ``) return ``;
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString(`en-US`, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const {
  buttonDisabledOpacity,
  buttonPrimaryRoundedCompact,
  errorTextClass,
  formFieldSpacing,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentLg,
  modalOverlayClass,
  modalParagraphClass,
  modalTitleClass,
  spaceY4,
} = styles;

const CURRENCIES = [`USD`, `EUR`, `GBP`, `JPY`, `AUD`] as const;
const CURRENCY_OPTIONS: FormSelectOption[] = CURRENCIES.map((c) => ({ value: c, label: c }));
const PAYMENT_REQUEST_DRAFT_STORAGE_KEY = `create-payment-request-draft`;

export function CreatePaymentRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [amountFocused, setAmountFocused] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<(typeof CURRENCIES)[number]>(`USD`);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreatePaymentRequestPayload | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>(``);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (searchParams.get(`resumePaymentRequest`) !== `1`) return;

    const saved = sessionStorage.getItem(PAYMENT_REQUEST_DRAFT_STORAGE_KEY);
    if (!saved) return;

    try {
      const draft = JSON.parse(saved) as {
        email?: string;
        amount?: string;
        currencyCode?: (typeof CURRENCIES)[number];
        description?: string;
        dueDate?: string;
      };

      setEmail(draft.email ?? ``);
      setAmount(draft.amount ?? ``);
      setCurrencyCode(draft.currencyCode ?? `USD`);
      setDescription(draft.description ?? ``);
      setDueDate(draft.dueDate ?? ``);
      sessionStorage.removeItem(PAYMENT_REQUEST_DRAFT_STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(PAYMENT_REQUEST_DRAFT_STORAGE_KEY);
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

  async function createPaymentRequest(payload: CreatePaymentRequestPayload) {
    const res = await fetch(`/api/payment-requests`, {
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
    throw new Error(err.message || `Request creation failed`);
  }

  async function submit() {
    setLoading(true);
    setError(null);

    const normalizedEmail = normalizeEmail(email);
    const payload: CreatePaymentRequestPayload = {
      email: normalizedEmail,
      amount,
      currencyCode,
      description: description || undefined,
      dueDate: dueDate || undefined,
    };

    try {
      const contacts = await loadContacts();
      const emailExists = hasContactForEmail(contacts, normalizedEmail);

      if (!emailExists) {
        setPendingPayload(payload);
        setPendingEmail(normalizedEmail);
        setConfirmOpen(true);
        return;
      }

      await createPaymentRequest(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Request creation failed`);
    } finally {
      setLoading(false);
    }
  }

  async function continueWithoutAdding() {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await continueWithUnknownRecipient({
        addToContacts: false,
        createContactAction: async () => ({ ok: true, status: 200, message: `` }),
        createPaymentRequestAction: async () => {
          await createPaymentRequest(pendingPayload);
        },
      });
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Request creation failed`);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function addAndContinue() {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    setError(null);
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
            message: String(parsed?.message || response.statusText || ``),
          };
        },
        createPaymentRequestAction: async () => {
          await createPaymentRequest(pendingPayload);
        },
      });
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to continue`);
    } finally {
      setConfirmLoading(false);
    }
  }

  function addFullContact() {
    if (!pendingPayload) return;

    sessionStorage.setItem(
      PAYMENT_REQUEST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        email: pendingPayload.email,
        amount,
        currencyCode,
        description,
        dueDate,
      }),
    );

    setConfirmOpen(false);
    router.push(
      `/contacts?create=1&email=${encodeURIComponent(
        pendingEmail,
      )}&returnTo=${encodeURIComponent(`/payment-requests/new?resumePaymentRequest=1`)}`,
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
      <FormField label="Recipient Email" description="We’ll notify them once you send the request.">
        <input
          type="email"
          required
          className={formFieldSpacing}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <FormField label={`Amount (${currencyCode})`}>
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            type="text"
            inputMode="decimal"
            required
            className={`${formFieldSpacing} min-w-0 flex-1`}
            value={amountFocused ? amount : formatMonetaryDisplay(amount)}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            onChange={(e) => setAmount(maskMonetary(e.target.value))}
            placeholder="0.00"
          />
          <div className="w-28 shrink-0">
            <FormSelect
              label=""
              value={currencyCode}
              onChange={(v) => setCurrencyCode(v as (typeof CURRENCIES)[number])}
              options={CURRENCY_OPTIONS}
              placeholder="USD"
              isClearable={false}
            />
          </div>
        </div>
      </FormField>

      <FormField label="Description" description="Shown on the request.">
        <textarea
          className={formFieldSpacing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Due Date" description="Optional deadline for payment.">
        <DateInput
          label=""
          value={dueDate || null}
          onChange={(v) => setDueDate(v ?? ``)}
          placeholder="Select due date"
        />
      </FormField>

      {!confirmOpen && error && <div className={errorTextClass}>{error}</div>}

      <button
        disabled={loading || confirmLoading}
        className={`${buttonPrimaryRoundedCompact} ${buttonDisabledOpacity}`}
      >
        {loading ? `Creating...` : `Create Request`}
      </button>

      {confirmOpen && (
        <div className={modalOverlayClass}>
          <div className={`${modalContentLg} ${spaceY4}`}>
            <h2 className={modalTitleClass}>This email isn&apos;t in your contacts. Add it automatically?</h2>
            <p className={modalParagraphClass}>
              You can add this contact now, or continue without adding it and still create the payment request.
            </p>
            {error && <div className={errorTextClass}>{error}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className={`${modalButtonSecondary} whitespace-nowrap`}
                  disabled={confirmLoading}
                >
                  Cancel
                </button>
              </div>
              <div ref={actionsMenuRef} className="relative">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void continueWithoutAdding();
                    }}
                    className={`${modalButtonPrimary} whitespace-nowrap`}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? `Working...` : `Continue`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionsOpen((open) => !open)}
                    className={`${modalButtonSecondary} inline-flex items-center gap-1 whitespace-nowrap`}
                    disabled={confirmLoading}
                  >
                    More Actions
                    <span aria-hidden>{actionsOpen ? `▴` : `▾`}</span>
                  </button>
                </div>
                {actionsOpen && (
                  <div
                    className="absolute bottom-full right-0 z-10 mb-2 min-w-[18rem]
                  overflow-hidden
                   rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        void addAndContinue();
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium
                       text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-700"
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
                      className="block w-full border-t border-gray-200 px-4 py-2.5 text-left text-sm 
                      font-medium text-gray-900 hover:bg-gray-100
                       dark:border-slate-700 dark:text-gray-100 dark:hover:bg-slate-700"
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
