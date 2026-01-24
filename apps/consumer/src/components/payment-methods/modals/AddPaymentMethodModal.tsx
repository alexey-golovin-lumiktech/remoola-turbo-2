'use client';

import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';

import { type StripeSetupIntentPayload, type PaymentMethodType, type CreatePaymentMethodDto } from '../../../types';
import { useTheme } from '../../ThemeProvider';
import styles from '../../ui/classNames.module.css';

const {
  checkboxPrimary,
  flexRowGap3,
  flexRowItemsCenter,
  gap2,
  methodToggleButtonActive,
  methodToggleButtonBase,
  methodToggleButtonInactive,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentLg,
  modalFieldVariant,
  modalFooterActions,
  modalInfoCard,
  modalOverlayClass,
  modalTitleClass,
  p2,
  p4,
  spaceY3,
  textMutedGrayStrong,
  textSm,
} = styles;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type AddPaymentMethodModalProps = {
  open: boolean;
  onCloseAction: () => void;
  onCreatedAction: () => void;
};

export function AddPaymentMethodModal({ open, onCloseAction, onCreatedAction }: AddPaymentMethodModalProps) {
  if (!open) return null;

  return (
    <Elements stripe={stripePromise}>
      <AddPaymentMethodModalInner open={open} onCloseAction={onCloseAction} onCreatedAction={onCreatedAction} />
    </Elements>
  );
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

    // 1) Create setup intent on backend
    const siRes = await fetch(`/api/stripe/setup-intent`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    if (!siRes.ok) {
      setLoading(false);
      alert(`Failed to create SetupIntent`);
      return;
    }

    const { clientSecret, setupIntentId } = (await siRes.json()) as StripeSetupIntentPayload;

    // 2) Confirm using Stripe Elements
    const cardElement = elements?.getElement(CardElement);

    const confirmRes = await stripe?.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement!,
        billing_details: {
          name: billingName,
          email: billingEmail,
          phone: billingPhone,
        },
      },
    });

    if (confirmRes?.error) {
      alert(confirmRes.error.message);
      setLoading(false);
      return;
    }

    const stripePaymentMethodId = confirmRes!.setupIntent.payment_method as string;

    const metaRes = await fetch(`/api/stripe/payment-method/metadata`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ stripePaymentMethodId }),
      credentials: `include`,
    });

    const cardMeta = await metaRes.json();

    // 3) Save method in Nest backend
    const payload: CreatePaymentMethodDto & any = {
      type: `CREDIT_CARD`,
      setupIntentId,
      defaultSelected,

      billingName,
      billingEmail,
      billingPhone,

      brand: cardMeta.brand,
      last4: cardMeta.last4,
      expMonth: cardMeta.expMonth.toString().padStart(2, `0`),
      expYear: cardMeta.expYear,
      stripePaymentMethodId: stripePaymentMethodId,
    };
    const saveRes = await fetch(`/api/payment-methods`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
      credentials: `include`,
    });

    setLoading(false);

    if (saveRes.ok) {
      onCreated();
      onClose();
    } else {
      alert(`Failed to add payment method`);
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
      alert(`Failed to add payment method`);
    }
  }

  async function submit() {
    if (methodType === `CREDIT_CARD`) {
      await createCardMethod();
    } else {
      await createBankMethod();
    }
  }

  return (
    <div className={modalOverlayClass} onClick={() => !loading && onClose()}>
      <div className={`${modalContentLg} space-y-5`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`${modalTitleClass} mb-2`}>Add payment method</h2>

        {/* Method selector */}
        <div className={flexRowGap3}>
          <button
            onClick={() => setMethodType(`CREDIT_CARD`)}
            className={`
              ${methodToggleButtonBase}
              ${methodType === `CREDIT_CARD` ? methodToggleButtonActive : methodToggleButtonInactive}
            `}
          >
            Credit Card
          </button>

          <button
            onClick={() => setMethodType(`BANK_ACCOUNT`)}
            className={`
              ${methodToggleButtonBase}
              ${methodType === `BANK_ACCOUNT` ? methodToggleButtonActive : methodToggleButtonInactive}
            `}
          >
            Bank Account
          </button>
        </div>

        {/* Billing details */}
        <div className={spaceY3}>
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
          <div className={`${modalInfoCard} ${p4}`}>
            <CardElement className={p2} options={cardElementOptions} />
          </div>
        )}

        {/* Bank form */}
        {methodType === `BANK_ACCOUNT` && (
          <div className={`${modalInfoCard} ${spaceY3} ${p4}`}>
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

        <label className={`${flexRowItemsCenter} ${gap2} ${textSm} ${textMutedGrayStrong}`}>
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
          <button onClick={() => !loading && onClose()} className={modalButtonSecondary}>
            Cancel
          </button>

          <button onClick={submit} disabled={loading} className={modalButtonPrimary}>
            {loading ? `Saving...` : `Add method`}
          </button>
        </div>
      </div>
    </div>
  );
}
