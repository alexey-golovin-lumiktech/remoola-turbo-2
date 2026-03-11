'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showWarningToast } from '../../../lib/toast.client';
import { AmountCurrencyInput } from '../../../shared/ui/AmountCurrencyInput';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { FormTextarea } from '../../../shared/ui/FormTextarea';
import { Modal } from '../../../shared/ui/Modal';

interface StartPaymentFormProps {
  defaultCurrency?: string;
}

export function StartPaymentForm({ defaultCurrency = `USD` }: StartPaymentFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState(`CREDIT_CARD`);

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(``);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/settings`, { credentials: `include`, cache: `no-store` })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredCurrency?: string | null } | null) => {
        if (data?.preferredCurrency) {
          setCurrency(data.preferredCurrency);
        }
      })
      .catch((err) => {
        clientLogger.warn(`Failed to load preferred currency for form`, { err });
      });
  }, []);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!email || !email.includes(`@`)) {
      newErrors.email = `Please enter a valid email address`;
    }

    const numAmount = Number(amount);
    if (!amount || Number.isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = `Please enter a valid amount greater than zero`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function checkContactExists(emailToCheck: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/contacts`, {
        method: `GET`,
        credentials: `include`,
        cache: `no-store`,
      });
      if (!res.ok) return false;
      const data = await res.json();
      const contacts = data.items ?? [];
      return contacts.some((c: { email: string }) => c.email.toLowerCase() === emailToCheck.toLowerCase());
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await checkContactExists(normalizedEmail);

    if (!exists) {
      setPendingEmail(normalizedEmail);
      setShowConfirmModal(true);
      setIsLoading(false);
      return;
    }

    await sendPayment(normalizedEmail);
  }

  async function sendPayment(emailToSend: string) {
    setIsLoading(true);
    try {
      // Convert dollar amount to cents
      const amountInCents = Math.round(Number(amount) * 100);

      const res = await fetch(`/api/payments/start`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({
          email: emailToSend,
          amount: amountInCents,
          currencyCode: currency,
          description: description || undefined,
          method,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/payments/${data.paymentRequestId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showErrorToast(err.message || `Payment failed. Please try again.`, { code: err.code || `PAYMENT_FAILED` });
      }
    } catch {
      showErrorToast(`Payment failed. Please try again.`, { code: `PAYMENT_FAILED` });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinueWithoutContact() {
    setShowConfirmModal(false);
    await sendPayment(pendingEmail);
  }

  async function handleAddContactAndContinue() {
    setShowConfirmModal(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/contacts`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({
          email: pendingEmail,
          name: null,
          address: {
            postalCode: null,
            country: null,
            state: null,
            city: null,
            street: null,
          },
        }),
      });

      if (!res.ok) {
        showWarningToast(`Could not add contact, but continuing with payment`);
      }

      await sendPayment(pendingEmail);
    } catch {
      showWarningToast(`Could not add contact, but continuing with payment`);
      await sendPayment(pendingEmail);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={`space-y-6`} data-testid="start-payment-form">
        <FormField
          label="Recipient email"
          htmlFor="email"
          required
          error={errors.email}
          hint="We'll send the payment to this email address"
        >
          <FormInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: `` }));
            }}
            placeholder="recipient@example.com"
            error={!!errors.email}
            required
          />
        </FormField>

        <FormField
          label="Amount"
          htmlFor="amount"
          required
          error={errors.amount}
          hint="Enter the amount you want to send"
        >
          <AmountCurrencyInput
            id="amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((prev) => ({ ...prev, amount: `` }));
            }}
            currency={currency}
            onCurrencyChange={setCurrency}
            placeholder="0.00"
            error={!!errors.amount}
            required
          />
        </FormField>

        <FormField label="Description" htmlFor="description" hint="Optional note about this payment">
          <FormTextarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this payment for?"
            rows={3}
          />
        </FormField>

        <FormField label="Payment method" htmlFor="method" required hint="How the recipient will receive payment">
          <FormSelect
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={[
              { value: `CREDIT_CARD`, label: `Credit Card` },
              { value: `BANK_ACCOUNT`, label: `Bank Account` },
            ]}
          />
        </FormField>

        <div className={`flex gap-3 pt-4`}>
          <Link href="/payments" className={`flex-1`}>
            <Button type="button" variant="outline" size="lg" className={`w-full`}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={`flex-1`}>
            {isLoading ? `Processing...` : `Send payment`}
          </Button>
        </div>
      </form>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Email not in contacts">
        <div className={`space-y-4`}>
          <p className={`text-sm text-slate-600 dark:text-slate-400`}>
            The email <strong className={`text-slate-900 dark:text-white`}>{pendingEmail}</strong> isn&apos;t in your
            contacts. Would you like to add it before sending the payment?
          </p>

          <div
            className={`
            flex
            flex-col
            gap-2
            pt-2
          `}
          >
            <Button variant="primary" size="md" onClick={handleAddContactAndContinue} className={`w-full`}>
              Add contact and continue
            </Button>
            <Button variant="outline" size="md" onClick={handleContinueWithoutContact} className={`w-full`}>
              Continue without adding
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowConfirmModal(false)} className={`w-full`}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
