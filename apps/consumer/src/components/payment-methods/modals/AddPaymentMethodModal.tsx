'use client';

import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { emailOptionalSchema } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import localStyles from './AddPaymentMethodModal.module.css';
import { type PaymentMethodType, type CreatePaymentMethodDto } from '../../../types';
import { useTheme } from '../../ThemeProvider';
import styles from '../../ui/classNames.module.css';

const {
  checkboxPrimary,
  methodToggleButtonActive,
  methodToggleButtonBase,
  methodToggleButtonInactive,
  modalButtonPrimary,
  modalButtonSecondary,
  modalFieldVariant,
  modalFooterActions,
  modalOverlayClass,
} = styles;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type AddPaymentMethodModalProps = {
  open: boolean;
  onCloseAction: () => void;
  onCreatedAction: () => void;
};

type ConfirmPersistResponse = Pick<Response, `ok` | `json`>;

export async function resolveConfirmPersistErrorMessage(response: ConfirmPersistResponse): Promise<string | null> {
  if (response.ok) return null;
  const errorData = (await response.json().catch(() => ({}))) as { message?: string };
  return errorData.message ?? `Failed to add payment method`;
}

type CreateCardMethodFlowDeps = {
  fetchFn: typeof fetch;
  stripe: {
    createPaymentMethod: (params: {
      type: `card`;
      card: unknown;
      billing_details: { name: string; email?: string; phone?: string };
    }) => Promise<{
      error: { message?: string | null } | null;
      paymentMethod: { id: string; card: Record<string, unknown> | null };
    }>;
    confirmCardSetup: (
      clientSecret: string,
      params: { payment_method: string },
    ) => Promise<{ error: { message?: string | null } | null; setupIntent?: { id?: string } | null }>;
  } | null;
  elements: {
    getElement: (element: typeof CardElement) => unknown | null;
  } | null;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  onCreated: () => void;
  onClose: () => void;
  onError: (message: string) => void;
};

export async function runCreateCardMethodFlow({
  fetchFn,
  stripe,
  elements,
  billingName,
  billingEmail,
  billingPhone,
  onCreated,
  onClose,
  onError,
}: CreateCardMethodFlowDeps): Promise<boolean> {
  try {
    const siRes = await fetchFn(`/api/stripe/setup-intent`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    if (!siRes.ok) {
      onError(`Failed to create SetupIntent`);
      return false;
    }

    const { clientSecret } = (await siRes.json()) as { clientSecret: string };
    if (!clientSecret) {
      onError(`No client secret received from setup intent`);
      return false;
    }

    const cardElement = elements?.getElement(CardElement);
    if (!cardElement) {
      onError(`Card element not found`);
      return false;
    }

    if (!stripe) {
      onError(`Stripe is not initialized. Please refresh and try again.`);
      return false;
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
      onError(pmError.message ?? `Card validation failed`);
      return false;
    }

    const card = pm.card;
    if (!card) {
      onError(`Card details missing from Stripe response`);
      return false;
    }

    const confirmRes = await stripe.confirmCardSetup(clientSecret, {
      payment_method: pm.id,
    });

    if (confirmRes.error) {
      onError(confirmRes.error.message ?? `Failed to add payment method`);
      return false;
    }

    const setupIntent = confirmRes.setupIntent;
    if (!setupIntent?.id) {
      onError(`Setup intent not confirmed`);
      return false;
    }

    const confirmRes2 = await fetchFn(`/api/stripe/confirm`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ setupIntentId: setupIntent.id }),
    });

    const persistError = await resolveConfirmPersistErrorMessage(confirmRes2);
    if (persistError) {
      onError(persistError);
      return false;
    }

    onCreated();
    onClose();
    return true;
  } catch {
    onError(`Failed to add payment method`);
    return false;
  }
}

export function AddPaymentMethodModal({ open, onCloseAction, onCreatedAction }: AddPaymentMethodModalProps) {
  if (!open) return null;

  return (
    <Elements stripe={stripePromise}>
      <AddPaymentMethodModalInner open={open} onCloseAction={onCloseAction} onCreatedAction={onCreatedAction} />
    </Elements>
  );
}

function joinMethodToggleClass(
  base: string | undefined,
  activeClass: string | undefined,
  inactiveClass: string | undefined,
  isActive: boolean,
) {
  return cn(base, isActive ? activeClass : inactiveClass);
}

function AddPaymentMethodModalInner({
  onCloseAction: onClose,
  onCreatedAction: onCreated,
}: AddPaymentMethodModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { resolvedTheme } = useTheme();

  const [methodType, setMethodType] = useState<PaymentMethodType>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);

  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);
  const [defaultSelected, setDefaultSelected] = useState(true);

  const [bankName, setBankName] = useState(``);
  const [bankAccount, setBankAccount] = useState(``);
  const [bankRouting, setBankRouting] = useState(``);

  const cardElementOptions = useMemo(
    () => ({
      style: {
        base: {
          color: resolvedTheme === `dark` ? `#e2e8f0` : `#0f172a`,
          backgroundColor: resolvedTheme === `dark` ? `#1e293b` : `#ffffff`,
          fontFamily: `ui-sans-serif, system-ui`,
          fontSize: `14px`,
          '::placeholder': {
            color: resolvedTheme === `dark` ? `#94a3b8` : `#64748b`,
          },
        },
        invalid: {
          color: `#ef4444`,
          iconColor: `#ef4444`,
        },
      },
    }),
    [resolvedTheme],
  );

  async function createCardMethod() {
    setLoading(true);
    try {
      await runCreateCardMethodFlow({
        fetchFn: fetch,
        stripe: stripe as CreateCardMethodFlowDeps[`stripe`],
        elements: elements as CreateCardMethodFlowDeps[`elements`],
        billingName,
        billingEmail,
        billingPhone,
        onCreated,
        onClose,
        onError: (message) => toast.error(message),
      });
    } catch {
      toast.error(`Failed to add payment method`);
    } finally {
      setLoading(false);
    }
  }

  async function createBankMethod() {
    setLoading(true);

    const payload: CreatePaymentMethodDto = {
      type: `BANK_ACCOUNT`,
      defaultSelected,

      billingName,
      billingEmail,
      billingPhone,

      brand: bankName,
      last4: bankAccount.slice(-4),
    };

    const res = await fetch(`/api/payment-methods`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
      credentials: `include`,
    });

    setLoading(false);

    if (res.ok) {
      onCreated();
      onClose();
    } else {
      toast.error(`Failed to add payment method`);
    }
  }

  async function submit() {
    const trimmedBillingEmail = billingEmail.trim();
    if (trimmedBillingEmail) {
      const parsed = emailOptionalSchema.safeParse(trimmedBillingEmail);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? `Enter a valid billing email`);
        return;
      }
    }
    if (methodType === `CREDIT_CARD`) {
      await createCardMethod();
    } else {
      await createBankMethod();
    }
  }

  return (
    <div
      className={modalOverlayClass}
      onClick={(e) => (e.stopPropagation(), e.preventDefault(), !loading && onClose())}
    >
      <div className={localStyles.modalBody} onClick={(e) => e.stopPropagation()}>
        <h2 className={localStyles.modalTitle}>Add Payment Method</h2>

        {/* Method selector */}
        <div className={localStyles.methodToggleRow}>
          <button
            onClick={(e) => (e.stopPropagation(), e.preventDefault(), setMethodType(`CREDIT_CARD`))}
            className={joinMethodToggleClass(
              methodToggleButtonBase,
              methodToggleButtonActive,
              methodToggleButtonInactive,
              methodType === `CREDIT_CARD`,
            )}
          >
            Credit Card
          </button>

          <button
            onClick={(e) => (e.stopPropagation(), e.preventDefault(), setMethodType(`BANK_ACCOUNT`))}
            className={joinMethodToggleClass(
              methodToggleButtonBase,
              methodToggleButtonActive,
              methodToggleButtonInactive,
              methodType === `BANK_ACCOUNT`,
            )}
          >
            Bank Account
          </button>
        </div>

        {/* Billing details */}
        <div className={localStyles.billingFields}>
          <input
            placeholder="Billing name"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className={modalFieldVariant}
          />

          <input
            placeholder="Billing email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className={modalFieldVariant}
          />

          <input
            placeholder="Billing phone"
            value={billingPhone}
            onChange={(e) => setBillingPhone(e.target.value)}
            className={modalFieldVariant}
          />
        </div>

        {/* Card form */}
        {methodType === `CREDIT_CARD` && (
          <div className={localStyles.cardElementWrap}>
            <CardElement className={localStyles.cardElementInner} options={cardElementOptions} />
          </div>
        )}

        {/* Bank form */}
        {methodType === `BANK_ACCOUNT` && (
          <div className={localStyles.bankFields}>
            <input
              placeholder="Bank name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={modalFieldVariant}
            />

            <input
              placeholder="Account number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={modalFieldVariant}
            />

            <input
              placeholder="Routing number"
              value={bankRouting}
              onChange={(e) => setBankRouting(e.target.value)}
              className={modalFieldVariant}
            />
          </div>
        )}

        <label className={localStyles.defaultCheckboxLabel}>
          <input
            type="checkbox"
            checked={defaultSelected}
            onChange={(e) => setDefaultSelected(e.target.checked)}
            className={checkboxPrimary}
          />
          Set as default payment method
        </label>

        {/* Footer buttons */}
        <div className={modalFooterActions}>
          <button
            onClick={(e) => (e.stopPropagation(), e.preventDefault(), !loading && onClose())}
            className={modalButtonSecondary}
          >
            Cancel
          </button>

          <button onClick={submit} disabled={loading} className={modalButtonPrimary}>
            {loading ? `Saving...` : `Add Payment Method`}
          </button>
        </div>
      </div>
    </div>
  );
}
