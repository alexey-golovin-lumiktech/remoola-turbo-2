'use client';

import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState, useMemo } from 'react';

import { cn } from '@remoola/ui';

import styles from './PaymentMethodForm.module.css';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { useTheme } from '../../../shared/ui/ThemeProvider';
import { addBankAccountAction } from '../actions';

type PaymentMethodType = `CREDIT_CARD` | `BANK_ACCOUNT`;

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type ConfirmPersistResponse = Pick<Response, `ok` | `json`>;

export async function resolveMobileConfirmErrorData(
  response: ConfirmPersistResponse,
): Promise<{ code?: string; message: string } | null> {
  if (response.ok) return null;
  const errorData = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  return {
    code: errorData.code,
    message: errorData.message ?? getLocalToastMessage(localToastKeys.PAYMENT_METHOD_ADD_FAILED),
  };
}

type RunMobileCardSubmitFlowDeps = {
  fetchFn: typeof fetch;
  stripe: {
    createPaymentMethod: (params: {
      type: `card`;
      card: unknown;
      billing_details: { name: string; email?: string; phone?: string };
    }) => Promise<{
      error: { type?: string; message?: string | null } | null;
      paymentMethod: { id: string; card: { brand?: string; last4?: string } | null };
    }>;
    confirmCardSetup: (
      clientSecret: string,
      params: { payment_method: string },
    ) => Promise<{
      error: { type?: string; message?: string | null } | null;
      setupIntent: { id: string };
    }>;
  } | null;
  elements: {
    getElement: (element: typeof CardElement) => unknown | null;
  } | null;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  onError: (message: string, code?: string) => void;
  onLogInfo: (message: string, meta?: Record<string, unknown>) => void;
  onLogError: (message: string, meta?: Record<string, unknown>) => void;
};

export async function runMobileCardSubmitFlow({
  fetchFn,
  stripe,
  elements,
  billingName,
  billingEmail,
  billingPhone,
  onError,
  onLogInfo,
  onLogError,
}: RunMobileCardSubmitFlowDeps): Promise<boolean> {
  if (!stripe || !elements) {
    onError(`Stripe is not initialized. Please refresh and try again.`);
    return false;
  }

  if (!billingName.trim()) {
    onError(`Cardholder name is required.`);
    return false;
  }

  try {
    const setupIntentRes = await fetchFn(`/api/stripe/setup-intent`, {
      method: `POST`,
      credentials: `include`,
    });

    if (!setupIntentRes.ok) {
      throw new Error(`Failed to create setup intent`);
    }

    const setupIntentData = await setupIntentRes.json();
    const clientSecret = setupIntentData.clientSecret || setupIntentData.client_secret;

    if (!clientSecret) {
      throw new Error(`No client secret received from setup intent`);
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      throw new Error(`Card element not found`);
    }

    const { error: pmError, paymentMethod: pm } = await stripe.createPaymentMethod({
      type: `card`,
      card: cardElement,
      billing_details: {
        name: billingName,
        email: billingEmail || undefined,
        phone: billingPhone || undefined,
      },
    });

    if (pmError) {
      const msg =
        pmError.type === `card_error`
          ? (pmError.message ?? `Your card was declined. Please try another card.`)
          : pmError.type === `validation_error`
            ? (pmError.message ?? `Please check your card details and try again.`)
            : (pmError.message ?? `An unexpected error occurred. Please try again.`);
      onError(msg);
      return false;
    }

    const card = pm.card;
    if (!card) {
      throw new Error(`Card details missing from Stripe response`);
    }

    const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: pm.id,
    });

    if (confirmError) {
      const msg =
        confirmError.type === `card_error`
          ? (confirmError.message ?? `Your card was declined. Please try another card.`)
          : confirmError.type === `validation_error`
            ? (confirmError.message ?? `Please check your card details and try again.`)
            : (confirmError.message ?? `An unexpected error occurred. Please try again.`);
      onError(msg);
      return false;
    }

    const finalSetupIntentId = setupIntent.id;

    onLogInfo(`Confirming setup intent`, { brand: card.brand, last4: card.last4 });

    const confirmRes = await fetchFn(`/api/stripe/confirm`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ setupIntentId: finalSetupIntentId }),
    });

    const confirmErrorData = await resolveMobileConfirmErrorData(confirmRes);
    if (confirmErrorData) {
      onError(getErrorMessageForUser(confirmErrorData.code, confirmErrorData.message), confirmErrorData.code);
      return false;
    }

    return true;
  } catch (err) {
    onLogError(`Add card failed`, {
      message: err instanceof Error ? err.message : String(err),
    });
    onError(getLocalToastMessage(localToastKeys.PAYMENT_METHOD_ADD_FAILED));
    return false;
  }
}

export function PaymentMethodForm({ onSuccess, onCancel }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { resolvedTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    return await runMobileCardSubmitFlow({
      fetchFn: fetch,
      stripe: stripe as RunMobileCardSubmitFlowDeps[`stripe`],
      elements: elements as RunMobileCardSubmitFlowDeps[`elements`],
      billingName,
      billingEmail,
      billingPhone,
      onError: (message, code) => showErrorToast(message, code ? { code } : undefined),
      onLogInfo: (message, meta) => clientLogger.info(message, meta),
      onLogError: (message, meta) => clientLogger.error(message, meta),
    });
  };

  const handleBankSubmit = async () => {
    if (!billingName.trim()) {
      showErrorToast(`Billing name is required.`);
      return false;
    }

    if (!bankName.trim()) {
      showErrorToast(`Bank name is required.`);
      return false;
    }

    if (!bankAccount.trim()) {
      showErrorToast(`Account number is required.`);
      return false;
    }

    if (!bankRouting.trim()) {
      showErrorToast(`Routing number is required.`);
      return false;
    }

    if (bankAccount.length < 4) {
      showErrorToast(`Account number must be at least 4 digits.`);
      return false;
    }

    if (bankRouting.length !== 9) {
      showErrorToast(`Routing number must be 9 digits.`);
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
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.PAYMENT_METHOD_ADD_FAILED)),
          { code: result.error.code },
        );
        return false;
      }

      return true;
    } catch (err) {
      clientLogger.error(`Add bank account failed`, {
        message: err instanceof Error ? err.message : String(err),
      });
      showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_METHOD_ADD_FAILED));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    const success = methodType === `CREDIT_CARD` ? await handleCardSubmit() : await handleBankSubmit();

    if (success) {
      onSuccess();
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Method Type Toggle */}
      <div className={styles.toggleRow}>
        <button
          type="button"
          onClick={() => setMethodType(`CREDIT_CARD`)}
          className={cn(
            styles.toggleBtn,
            methodType === `CREDIT_CARD` ? styles.toggleBtnActive : styles.toggleBtnInactive,
          )}
        >
          Credit Card
        </button>
        <button
          type="button"
          onClick={() => setMethodType(`BANK_ACCOUNT`)}
          className={cn(
            styles.toggleBtn,
            methodType === `BANK_ACCOUNT` ? styles.toggleBtnActive : styles.toggleBtnInactive,
          )}
        >
          Bank Account
        </button>
      </div>

      {/* Billing Details */}
      <div className={styles.billingSection}>
        <label className={styles.labelBlock}>
          <span className={styles.labelText}>
            Cardholder name <span className={styles.requiredStar}>*</span>
          </span>
          <input
            type="text"
            placeholder="John Doe"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.labelBlock}>
          <span className={styles.labelText}>Email (optional)</span>
          <input
            type="email"
            placeholder="john@example.com"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.labelBlock}>
          <span className={styles.labelText}>Phone (optional)</span>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={billingPhone}
            onChange={(e) => setBillingPhone(e.target.value)}
            className={styles.input}
          />
        </label>
      </div>

      {/* Card Details (Credit Card only) */}
      {methodType === `CREDIT_CARD` ? (
        <div className={styles.cardSection}>
          <label className={styles.cardSectionLabel}>Card details</label>
          <CardElement options={cardElementOptions} />
        </div>
      ) : null}

      {/* Bank Account Details (Bank Account only) */}
      {methodType === `BANK_ACCOUNT` ? (
        <div className={styles.bankSection}>
          <label className={styles.labelBlock}>
            <span className={styles.labelText}>
              Bank name <span className={styles.requiredStar}>*</span>
            </span>
            <input
              type="text"
              placeholder="Chase Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.labelBlock}>
            <span className={styles.labelText}>
              Account number <span className={styles.requiredStar}>*</span>
            </span>
            <input
              type="text"
              placeholder="000123456789"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ``))}
              className={styles.input}
            />
          </label>

          <label className={styles.labelBlock}>
            <span className={styles.labelText}>
              Routing number <span className={styles.requiredStar}>*</span>
            </span>
            <input
              type="text"
              placeholder="110000000"
              value={bankRouting}
              onChange={(e) => setBankRouting(e.target.value.replace(/\D/g, ``).slice(0, 9))}
              maxLength={9}
              className={styles.input}
            />
            <p className={styles.bankHint}>9-digit number found on your checks</p>
          </label>
        </div>
      ) : null}

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={defaultSelected}
          onChange={(e) => setDefaultSelected(e.target.checked)}
          className={styles.checkbox}
        />
        <span>Set as default payment method</span>
      </label>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          className={styles.actionBtn}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={methodType === `CREDIT_CARD` ? !stripe || !elements || isSubmitting : isSubmitting}
          className={styles.actionBtn}
        >
          Add method
        </Button>
      </div>
    </form>
  );
}
