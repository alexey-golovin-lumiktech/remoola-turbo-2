'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { showErrorToast, showWarningToast } from '../../lib/toast.client';
import { AmountCurrencyInput } from '../../shared/ui/AmountCurrencyInput';
import { Button } from '../../shared/ui/Button';
import { DatePicker } from '../../shared/ui/DatePicker';
import { FormField } from '../../shared/ui/FormField';
import { FormInput } from '../../shared/ui/FormInput';
import { FormTextarea } from '../../shared/ui/FormTextarea';
import { Modal } from '../../shared/ui/Modal';

interface CreatePaymentRequestFormProps {
  defaultCurrency?: string;
}

export function CreatePaymentRequestForm({ defaultCurrency = `USD` }: CreatePaymentRequestFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState(``);
  const [dueDate, setDueDate] = useState(``);

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
      .catch(() => {});
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

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDateObj < today) {
        newErrors.dueDate = `Due date must be today or in the future`;
      }
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

    await createPaymentRequest(normalizedEmail);
  }

  async function createPaymentRequest(emailToSend: string) {
    setIsLoading(true);
    try {
      // Convert dollar amount to cents
      const amountInCents = Math.round(Number(amount) * 100);

      const res = await fetch(`/api/payment-requests`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({
          email: emailToSend,
          amount: amountInCents,
          currencyCode: currency,
          description: description || undefined,
          dueDate: dueDate || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/payments/${data.paymentRequestId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showErrorToast(err.message || `Failed to create payment request. Please try again.`, {
          code: err.code || `REQUEST_FAILED`,
        });
      }
    } catch {
      showErrorToast(`Failed to create payment request. Please try again.`, { code: `REQUEST_FAILED` });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinueWithoutContact() {
    setShowConfirmModal(false);
    await createPaymentRequest(pendingEmail);
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
        showWarningToast(`Could not add contact, but continuing with request`);
      }

      await createPaymentRequest(pendingEmail);
    } catch {
      showWarningToast(`Could not add contact, but continuing with request`);
      await createPaymentRequest(pendingEmail);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={`space-y-6`} data-testid="create-payment-request-form">
        <FormField
          label="Recipient email"
          htmlFor="email"
          required
          error={errors.email}
          hint="We'll notify them once you send the request"
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
          hint="Enter the amount you're requesting"
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

        <FormField label="Description" htmlFor="description" hint="Explain what this payment is for">
          <FormTextarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this payment request for?"
            rows={3}
          />
        </FormField>

        <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate} hint="Optional deadline for payment">
          <DatePicker
            id="dueDate"
            value={dueDate}
            onChange={(value) => {
              setDueDate(value);
              setErrors((prev) => ({ ...prev, dueDate: `` }));
            }}
            error={!!errors.dueDate}
            min={new Date().toISOString().split(`T`)[0]}
            placeholder="Select due date"
          />
        </FormField>

        <div className={`flex gap-3 pt-4`}>
          <Link href="/payments" className={`flex-1`}>
            <Button type="button" variant="outline" size="lg" className={`w-full`}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={`flex-1`}>
            {isLoading ? `Creating...` : `Create request`}
          </Button>
        </div>
      </form>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Email not in contacts">
        <div className={`space-y-4`}>
          <p className={`text-sm text-slate-600 dark:text-slate-400`}>
            The email <strong className={`text-slate-900 dark:text-white`}>{pendingEmail}</strong> isn&apos;t in your
            contacts. Would you like to add it before creating the payment request?
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
