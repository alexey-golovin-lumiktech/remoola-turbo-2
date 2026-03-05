'use client';

import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState, useMemo } from 'react';

import { clientLogger } from '../../../lib/logger';
import { Button } from '../../../shared/ui/Button';
import { useTheme } from '../../../shared/ui/ThemeProvider';
import { addPaymentMethodAction, addBankAccountAction } from '../actions';

type PaymentMethodType = `CREDIT_CARD` | `BANK_ACCOUNT`;

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentMethodForm({ onSuccess, onCancel }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { resolvedTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodType, setMethodType] = useState<PaymentMethodType>(`CREDIT_CARD`);

  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);
  const [defaultSelected, setDefaultSelected] = useState(true);

  const [bankName, setBankName] = useState(``);
  const [bankAccount, setBankAccount] = useState(``);
  const [bankRouting, setBankRouting] = useState(``);
  const cardElementOptions = useMemo(() => {
    const isDark = resolvedTheme === `dark`;

    return {
      style: {
        base: {
          color: isDark ? `#e2e8f0` : `#1e293b`,
          backgroundColor: `transparent`,
          fontFamily: `system-ui, -apple-system, sans-serif`,
          fontSize: `14px`,
          fontSmoothing: `antialiased`,
          '::placeholder': {
            color: isDark ? `#64748b` : `#94a3b8`,
          },
        },
        invalid: {
          color: `#ef4444`,
          iconColor: `#ef4444`,
        },
      },
    };
  }, [resolvedTheme]);

  const handleCardSubmit = async () => {
    if (!stripe || !elements) {
      setError(`Stripe is not initialized. Please refresh and try again.`);
      return false;
    }

    if (!billingName.trim()) {
      setError(`Cardholder name is required.`);
      return false;
    }

    try {
      const setupIntentRes = await fetch(`/api/stripe/setup-intent`, {
        method: `POST`,
        credentials: `include`,
      });

      if (!setupIntentRes.ok) {
        throw new Error(`Failed to create setup intent`);
      }

      const setupIntentData = await setupIntentRes.json();

      clientLogger.info(`Setup Intent response received`, {
        setupIntentId: setupIntentData.setupIntentId || setupIntentData.id,
      });

      const clientSecret = setupIntentData.clientSecret || setupIntentData.client_secret;
      const setupIntentId = setupIntentData.setupIntentId || setupIntentData.id;

      if (!clientSecret) {
        throw new Error(`No client secret received from setup intent`);
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(`Card element not found`);
      }

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingName,
            email: billingEmail || undefined,
            phone: billingPhone || undefined,
          },
        },
      });

      if (confirmError) {
        switch (confirmError.type) {
          case `card_error`:
            setError(confirmError.message ?? `Your card was declined. Please try another card.`);
            break;
          case `validation_error`:
            setError(confirmError.message ?? `Please check your card details and try again.`);
            break;
          default:
            setError(confirmError.message ?? `An unexpected error occurred. Please try again.`);
        }
        return false;
      }

      const stripePaymentMethodId = setupIntent.payment_method as string;
      // Use setupIntent.id as fallback if backend didn't provide setupIntentId
      const finalSetupIntentId = setupIntentId || setupIntent.id;

      const metaRes = await fetch(`/api/stripe/payment-method/metadata`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ stripePaymentMethodId }),
        credentials: `include`,
      });

      if (!metaRes.ok) {
        throw new Error(`Failed to fetch payment method metadata`);
      }

      const cardMeta = await metaRes.json();

      const paymentMethodData = {
        setupIntentId: finalSetupIntentId,
        defaultSelected,

        billingName,
        billingEmail: billingEmail || undefined,
        billingPhone: billingPhone || undefined,

        brand: cardMeta.brand,
        last4: cardMeta.last4,
        expMonth: cardMeta.expMonth.toString().padStart(2, `0`),
        expYear: cardMeta.expYear,
        stripePaymentMethodId,
      };

      clientLogger.info(`Submitting payment method`, {
        brand: paymentMethodData.brand,
        last4: paymentMethodData.last4,
      });

      const result = await addPaymentMethodAction(paymentMethodData);

      if (!result.ok) {
        setError(result.error.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : `An unexpected error occurred`);
      return false;
    }
  };

  const handleBankSubmit = async () => {
    if (!billingName.trim()) {
      setError(`Billing name is required.`);
      return false;
    }

    if (!bankName.trim()) {
      setError(`Bank name is required.`);
      return false;
    }

    if (!bankAccount.trim()) {
      setError(`Account number is required.`);
      return false;
    }

    if (!bankRouting.trim()) {
      setError(`Routing number is required.`);
      return false;
    }

    if (bankAccount.length < 4) {
      setError(`Account number must be at least 4 digits.`);
      return false;
    }

    if (bankRouting.length !== 9) {
      setError(`Routing number must be 9 digits.`);
      return false;
    }

    try {
      const result = await addBankAccountAction({
        defaultSelected,
        billingName,
        billingEmail: billingEmail || undefined,
        billingPhone: billingPhone || undefined,
        bankName,
        last4: bankAccount.slice(-4),
        routingNumber: bankRouting,
        accountNumber: bankAccount,
      });

      if (!result.ok) {
        setError(result.error.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : `An unexpected error occurred`);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    const success = methodType === `CREDIT_CARD` ? await handleCardSubmit() : await handleBankSubmit();

    if (success) {
      onSuccess();
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="
        space-y-4
      "
    >
      {/* Method Type Toggle */}
      <div
        className="
          flex
          gap-3
        "
      >
        <button
          type="button"
          onClick={() => {
            setMethodType(`CREDIT_CARD`);
            setError(null);
          }}
          className={`
            flex-1
            min-h-[44px]
            rounded-lg
            px-4
            py-2
            text-sm
            font-medium
            transition-all
            ${
              methodType === `CREDIT_CARD`
                ? `
                    bg-primary-600
                    text-white
                    shadow-sm
                    hover:bg-primary-700
                  `
                : `
                    border
                    border-slate-300
                    bg-white
                    text-slate-700
                    hover:bg-slate-50
                    dark:border-slate-600
                    dark:bg-slate-800
                    dark:text-slate-300
                    dark:hover:bg-slate-700
                  `
            }
          `}
        >
          Credit Card
        </button>
        <button
          type="button"
          onClick={() => {
            setMethodType(`BANK_ACCOUNT`);
            setError(null);
          }}
          className={`
            flex-1
            min-h-[44px]
            rounded-lg
            px-4
            py-2
            text-sm
            font-medium
            transition-all
            ${
              methodType === `BANK_ACCOUNT`
                ? `
                    bg-primary-600
                    text-white
                    shadow-sm
                    hover:bg-primary-700
                  `
                : `
                    border
                    border-slate-300
                    bg-white
                    text-slate-700
                    hover:bg-slate-50
                    dark:border-slate-600
                    dark:bg-slate-800
                    dark:text-slate-300
                    dark:hover:bg-slate-700
                  `
            }
          `}
        >
          Bank Account
        </button>
      </div>

      {/* Billing Details */}
      <div
        className="
          space-y-3
        "
      >
        <label
          className="
            block
          "
        >
          <span
            className="
              mb-1
              block
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            "
          >
            Cardholder name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            placeholder="John Doe"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="
              w-full
              min-h-[44px]
              rounded-lg
              border
              border-slate-300
              bg-white
              px-4
              py-2
              text-sm
              text-slate-900
              placeholder-slate-400
              transition-colors
              focus:border-primary-500
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500/20
              dark:border-slate-600
              dark:bg-slate-800
              dark:text-white
              dark:placeholder-slate-500
              dark:focus:border-primary-400
            "
          />
        </label>

        <label
          className="
            block
          "
        >
          <span
            className="
              mb-1
              block
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            "
          >
            Email (optional)
          </span>
          <input
            type="email"
            placeholder="john@example.com"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="
              w-full
              min-h-[44px]
              rounded-lg
              border
              border-slate-300
              bg-white
              px-4
              py-2
              text-sm
              text-slate-900
              placeholder-slate-400
              transition-colors
              focus:border-primary-500
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500/20
              dark:border-slate-600
              dark:bg-slate-800
              dark:text-white
              dark:placeholder-slate-500
              dark:focus:border-primary-400
            "
          />
        </label>

        <label
          className="
            block
          "
        >
          <span
            className="
              mb-1
              block
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            "
          >
            Phone (optional)
          </span>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={billingPhone}
            onChange={(e) => setBillingPhone(e.target.value)}
            className="
              w-full
              min-h-[44px]
              rounded-lg
              border
              border-slate-300
              bg-white
              px-4
              py-2
              text-sm
              text-slate-900
              placeholder-slate-400
              transition-colors
              focus:border-primary-500
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500/20
              dark:border-slate-600
              dark:bg-slate-800
              dark:text-white
              dark:placeholder-slate-500
              dark:focus:border-primary-400
            "
          />
        </label>
      </div>

      {/* Card Details (Credit Card only) */}
      {methodType === `CREDIT_CARD` && (
        <div
          className="
            rounded-lg
            border
            border-slate-300
            bg-white
            p-4
            dark:border-slate-600
            dark:bg-slate-800
          "
        >
          <label
            className="
              mb-2
              block
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            "
          >
            Card details
          </label>
          <CardElement options={cardElementOptions} />
        </div>
      )}

      {/* Bank Account Details (Bank Account only) */}
      {methodType === `BANK_ACCOUNT` && (
        <div
          className="
            space-y-3
          "
        >
          <label
            className="
              block
            "
          >
            <span
              className="
                mb-1
                block
                text-sm
                font-medium
                text-slate-700
                dark:text-slate-300
              "
            >
              Bank name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              placeholder="Chase Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="
                w-full
                min-h-[44px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                py-2
                text-sm
                text-slate-900
                placeholder-slate-400
                transition-colors
                focus:border-primary-500
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500/20
                dark:border-slate-600
                dark:bg-slate-800
                dark:text-white
                dark:placeholder-slate-500
                dark:focus:border-primary-400
              "
            />
          </label>

          <label
            className="
              block
            "
          >
            <span
              className="
                mb-1
                block
                text-sm
                font-medium
                text-slate-700
                dark:text-slate-300
              "
            >
              Account number <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              placeholder="000123456789"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ``))}
              className="
                w-full
                min-h-[44px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                py-2
                text-sm
                text-slate-900
                placeholder-slate-400
                transition-colors
                focus:border-primary-500
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500/20
                dark:border-slate-600
                dark:bg-slate-800
                dark:text-white
                dark:placeholder-slate-500
                dark:focus:border-primary-400
              "
            />
          </label>

          <label
            className="
              block
            "
          >
            <span
              className="
                mb-1
                block
                text-sm
                font-medium
                text-slate-700
                dark:text-slate-300
              "
            >
              Routing number <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              placeholder="110000000"
              value={bankRouting}
              onChange={(e) => setBankRouting(e.target.value.replace(/\D/g, ``).slice(0, 9))}
              maxLength={9}
              className="
                w-full
                min-h-[44px]
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                py-2
                text-sm
                text-slate-900
                placeholder-slate-400
                transition-colors
                focus:border-primary-500
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500/20
                dark:border-slate-600
                dark:bg-slate-800
                dark:text-white
                dark:placeholder-slate-500
                dark:focus:border-primary-400
              "
            />
            <p
              className="
                mt-1
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              9-digit number found on your checks
            </p>
          </label>
        </div>
      )}

      <label
        className="
          flex
          items-center
          gap-3
          text-sm
          text-slate-700
          dark:text-slate-300
        "
      >
        <input
          type="checkbox"
          checked={defaultSelected}
          onChange={(e) => setDefaultSelected(e.target.checked)}
          className="
            h-5
            w-5
            min-h-[20px]
            min-w-[20px]
            rounded
            border-slate-300
            text-primary-600
            transition-colors
            focus:ring-2
            focus:ring-primary-500/20
            dark:border-slate-600
            dark:bg-slate-700
            dark:checked:bg-primary-600
          "
        />
        <span>Set as default payment method</span>
      </label>

      {error && (
        <div
          className="
            rounded-lg
            border
            border-red-200
            bg-red-50
            p-3
            dark:border-red-800
            dark:bg-red-900/20
          "
          role="alert"
        >
          <p
            className="
              text-sm
              text-red-800
              dark:text-red-300
            "
          >
            {error}
          </p>
        </div>
      )}

      <div
        className="
          flex
          flex-col
          gap-3
          pt-2
          sm:flex-row
        "
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          className="
            min-h-[44px]
            flex-1
          "
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={methodType === `CREDIT_CARD` ? !stripe || !elements || isSubmitting : isSubmitting}
          className="
            min-h-[44px]
            flex-1
          "
        >
          Add method
        </Button>
      </div>
    </form>
  );
}
