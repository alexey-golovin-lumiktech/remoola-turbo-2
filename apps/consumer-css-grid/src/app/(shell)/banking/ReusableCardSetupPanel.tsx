'use client';

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { isValidEmail, normalizeEmail, normalizePhone, phoneDigitsCount } from './banking-helpers';
import {
  confirmReusableCardSetupIntentMutation,
  createReusableCardSetupIntentMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';

type Message = {
  type: `error` | `success`;
  text: string;
} | null;

type Props = {
  onMessage: (message: Message) => void;
};

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? ``;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function ReusableCardSetupForm({ onMessage }: Props) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);

  const emailValid = billingEmail.length === 0 || isValidEmail(billingEmail);
  const phoneValid = billingPhone.length === 0 || phoneDigitsCount(billingPhone) >= 7;
  const formValid = billingName.trim().length > 0 && emailValid && phoneValid && stripePublishableKey.length > 0;

  const cardElementOptions = useMemo(
    () => ({
      style: {
        base: {
          color: `#f8fafc`,
          fontFamily: `system-ui, -apple-system, sans-serif`,
          fontSize: `16px`,
          lineHeight: `24px`,
          '::placeholder': {
            color: `rgba(255,255,255,0.38)`,
          },
        },
        invalid: {
          color: `#fda4af`,
          iconColor: `#fda4af`,
        },
      },
    }),
    [],
  );

  async function handleSubmit() {
    if (!formValid || isSubmitting) return;
    if (!stripePublishableKey) {
      onMessage({
        type: `error`,
        text: `Reusable card setup is unavailable because the Stripe publishable key is not configured.`,
      });
      return;
    }
    if (!stripe || !elements) {
      onMessage({
        type: `error`,
        text: `Stripe is still loading. Please try again in a moment.`,
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onMessage({
        type: `error`,
        text: `Card details could not be loaded. Please refresh and try again.`,
      });
      return;
    }

    onMessage(null);
    setIsSubmitting(true);

    try {
      const setupIntentResult = await createReusableCardSetupIntentMutation();
      if (!setupIntentResult.ok) {
        if (handleSessionExpiredError(setupIntentResult.error)) return;
        onMessage({ type: `error`, text: setupIntentResult.error.message });
        return;
      }

      const confirmation = await stripe.confirmCardSetup(setupIntentResult.data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingName.trim(),
            email: billingEmail.trim() || undefined,
            phone: billingPhone.trim() || undefined,
          },
        },
      });

      if (confirmation.error) {
        onMessage({
          type: `error`,
          text: confirmation.error.message ?? `Reusable card setup could not be completed.`,
        });
        return;
      }

      const setupIntentId = confirmation.setupIntent?.id?.trim();
      if (!setupIntentId) {
        onMessage({
          type: `error`,
          text: `Stripe did not return a setup intent id for this reusable card.`,
        });
        return;
      }

      const confirmResult = await confirmReusableCardSetupIntentMutation(setupIntentId);
      if (!confirmResult.ok) {
        if (handleSessionExpiredError(confirmResult.error)) return;
        onMessage({ type: `error`, text: confirmResult.error.message });
        return;
      }

      setBillingName(``);
      setBillingEmail(``);
      setBillingPhone(``);
      elements.getElement(CardElement)?.clear();
      onMessage({
        type: `success`,
        text: `Reusable card added. It can now be used for one-click payer payments.`,
      });
      router.refresh();
    } catch {
      onMessage({
        type: `error`,
        text: `Reusable card setup could not be completed.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[var(--app-primary)]/15 bg-[var(--app-primary-soft)] px-4 py-4 text-sm text-[var(--app-text-soft)]">
        <div className="font-medium text-[var(--app-text)]">Reusable Stripe card</div>
        <div className="mt-2 leading-6">
          This card is saved with Stripe and can be used for one-click payer payments from payment detail. If you only
          need a Banking record for display or billing metadata, use{` `}
          <span className="font-medium">Manual card record</span>
          {` `}
          instead.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--app-text-muted)]">Cardholder name</span>
          <input
            value={billingName}
            onChange={(event) => setBillingName(event.target.value)}
            placeholder="Cardholder name"
            className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
        </label>
        <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-muted)]">
          <div className="font-medium text-[var(--app-text)]">Default behavior</div>
          <div className="mt-2 leading-6">
            This flow saves the reusable card first. If you want it to become the default card later, use the existing
            <span className="font-medium"> Set default</span> action after it appears in Banking.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--app-text-muted)]">Billing email</span>
          <input
            type="email"
            value={billingEmail}
            onChange={(event) => setBillingEmail(normalizeEmail(event.target.value))}
            placeholder="Billing email"
            aria-invalid={!emailValid}
            className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
          {billingEmail.length > 0 ? (
            <div className={`text-xs ${emailValid ? `text-[var(--app-text-faint)]` : `text-[var(--app-danger-text)]`}`}>
              {emailValid ? `Email will be saved in lowercase.` : `Enter a valid email address.`}
            </div>
          ) : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--app-text-muted)]">Billing phone</span>
          <input
            value={billingPhone}
            inputMode="tel"
            onChange={(event) => setBillingPhone(normalizePhone(event.target.value))}
            placeholder="Billing phone"
            aria-invalid={!phoneValid}
            className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
          {billingPhone.length > 0 ? (
            <div className={`text-xs ${phoneValid ? `text-[var(--app-text-faint)]` : `text-[var(--app-danger-text)]`}`}>
              {phoneValid ? `Phone is stored as digits with optional leading +.` : `Enter at least 7 digits.`}
            </div>
          ) : null}
        </label>
      </div>

      <div className="grid gap-2">
        <span className="text-sm text-[var(--app-text-muted)]">Card details</span>
        <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {!stripePublishableKey ? (
        <div className="rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]">
          Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to enable reusable card setup in Banking.
        </div>
      ) : null}

      <button
        type="button"
        disabled={!formValid || isSubmitting}
        onClick={() => void handleSubmit()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? <SpinnerIcon size={18} className="animate-spin" /> : null}
        {isSubmitting ? `Saving reusable card...` : `Add reusable card`}
      </button>
    </div>
  );
}

export function ReusableCardSetupPanel({ onMessage }: Props) {
  return (
    <Elements stripe={stripePromise}>
      <ReusableCardSetupForm onMessage={onMessage} />
    </Elements>
  );
}
