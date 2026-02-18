'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createContactRequest } from '../../lib/create-contact';
import {
  continueWithUnknownRecipient,
  hasContactForEmail,
  normalizeEmail,
} from '../../lib/payment-request-recipient-flow';
import { type ConsumerContact, type CreatePaymentRequestPayload } from '../../types';
import { FormField } from '../ui';
import styles from '../ui/classNames.module.css';

const {
  buttonDisabledOpacity,
  buttonPrimaryRoundedCompact,
  errorTextClass,
  formFieldSpacing,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentMd,
  modalFooterActions,
  modalOverlayClass,
  modalParagraphClass,
  modalTitleClass,
  spaceY4,
} = styles;

const CURRENCIES = [`USD`, `EUR`, `GBP`, `JPY`, `AUD`] as const;

export function CreatePaymentRequestForm() {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currencyCode, setCurrencyCode] = useState<(typeof CURRENCIES)[number]>(`USD`);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<CreatePaymentRequestPayload | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>(``);

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
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          className={formFieldSpacing}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Currency">
        <select
          className={formFieldSpacing}
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value as (typeof CURRENCIES)[number])}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
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
        <input type="date" className={formFieldSpacing} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
          <div className={`${modalContentMd} ${spaceY4}`}>
            <h2 className={modalTitleClass}>This email isn&apos;t in your contacts. Add it automatically?</h2>
            <p className={modalParagraphClass}>
              You can add this contact now, or continue without adding it and still create the payment request.
            </p>
            {error && <div className={errorTextClass}>{error}</div>}
            <div className={modalFooterActions}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className={modalButtonSecondary}
                disabled={confirmLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={continueWithoutAdding}
                className={modalButtonSecondary}
                disabled={confirmLoading}
              >
                Continue without adding
              </button>
              <button type="button" onClick={addAndContinue} className={modalButtonPrimary} disabled={confirmLoading}>
                {confirmLoading ? `Working...` : `Add & Continue`}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
