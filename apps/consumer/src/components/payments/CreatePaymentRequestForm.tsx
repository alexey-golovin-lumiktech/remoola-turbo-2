'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODE, emailSchema, isCurrencyCode, type TCurrencyCode } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import localStyles from './CreatePaymentRequestForm.module.css';
import { createContactRequest } from '../../lib/create-contact';
import { getErrorMessageForUser } from '../../lib/error-messages';
import {
  continueWithUnknownRecipient,
  hasContactForEmail,
  normalizeEmail,
} from '../../lib/payment-request-recipient-flow';
import { type ConsumerContact, type CreatePaymentRequestPayload } from '../../types';
import { AmountCurrencyInput, DateInput, FormField, RecipientEmailField } from '../ui';
import shared from '../ui/classNames.module.css';

const { formFieldSpacing, modalContentLg, modalOverlayClass, modalParagraphClass, modalTitleClass } = shared;
const PAYMENT_REQUEST_DRAFT_STORAGE_KEY = `create-payment-request-draft`;

export function CreatePaymentRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<TCurrencyCode>(CURRENCY_CODE.USD);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreatePaymentRequestPayload | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>(``);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [defaultCurrencyLoaded, setDefaultCurrencyLoaded] = useState(false);

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
    if (searchParams.get(`resumePaymentRequest`) !== `1`) return;

    const saved = sessionStorage.getItem(PAYMENT_REQUEST_DRAFT_STORAGE_KEY);
    if (!saved) return;

    try {
      const draft = JSON.parse(saved) as {
        email?: string;
        amount?: string;
        currencyCode?: TCurrencyCode;
        description?: string;
        dueDate?: string;
      };

      setEmail(draft.email ?? ``);
      setAmount(draft.amount ?? ``);
      setCurrencyCode(draft.currencyCode ?? CURRENCY_CODE.USD);
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
    const emailParsed = emailSchema.safeParse(email.trim());
    if (!emailParsed.success) {
      toast.error(emailParsed.error.issues[0]?.message ?? `Please enter a valid recipient email.`);
      return;
    }
    const normalizedEmail = normalizeEmail(emailParsed.data);
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(`Please enter a valid amount.`);
      return;
    }

    setLoading(true);

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
      const raw = err instanceof Error ? err.message : `Request creation failed`;
      toast.error(getErrorMessageForUser(raw, `We couldn't create the payment request. Please try again.`));
    } finally {
      setLoading(false);
    }
  }

  async function continueWithoutAdding() {
    if (!pendingPayload) return;
    setConfirmLoading(true);
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
      const raw = err instanceof Error ? err.message : `Request creation failed`;
      toast.error(getErrorMessageForUser(raw, `We couldn't create the payment request. Please try again.`));
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
            message: String(parsed?.message || response.statusText || ``),
          };
        },
        createPaymentRequestAction: async () => {
          await createPaymentRequest(pendingPayload);
        },
      });
      setConfirmOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to continue`;
      toast.error(getErrorMessageForUser(raw, `We couldn't add the contact or create the request. Please try again.`));
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
      className={localStyles.formStack}
    >
      <RecipientEmailField
        label="Recipient Email"
        description="We’ll notify them once you send the request."
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

      <button disabled={loading || confirmLoading} className={localStyles.submitButton}>
        {loading ? `Creating...` : `Create Request`}
      </button>

      {confirmOpen && (
        <div className={modalOverlayClass}>
          <div className={cn(modalContentLg, localStyles.modalStack)}>
            <h2 className={modalTitleClass}>This email isn&apos;t in your contacts. Add it automatically?</h2>
            <p className={modalParagraphClass}>
              You can add this contact now, or continue without adding it and still create the payment request.
            </p>
            <div className={localStyles.confirmActionsBar}>
              <div className={localStyles.confirmCancelGroup}>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className={localStyles.modalCancelButton}
                  disabled={confirmLoading}
                >
                  Cancel
                </button>
              </div>
              <div ref={actionsMenuRef} className={localStyles.actionsMenuAnchor}>
                <div className={localStyles.actionsButtonRow}>
                  <button
                    type="button"
                    onClick={() => {
                      void continueWithoutAdding();
                    }}
                    className={localStyles.modalContinueButton}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? `Working...` : `Continue`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionsOpen((open) => !open)}
                    className={localStyles.moreActionsButton}
                    disabled={confirmLoading}
                    aria-expanded={actionsOpen}
                    aria-haspopup="true"
                    aria-controls="create-payment-request-actions-menu"
                  >
                    More Actions
                    <span aria-hidden>{actionsOpen ? `▴` : `▾`}</span>
                  </button>
                </div>
                {actionsOpen && (
                  <div id="create-payment-request-actions-menu" className={localStyles.actionsDropdown}>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        void addAndContinue();
                      }}
                      className={localStyles.actionsDropdownItem}
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
                      className={localStyles.actionsDropdownItemBordered}
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
