'use client';

import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

import {
  type StripeSetupIntentPayload,
  type PaymentMethodType,
  type CreatePaymentMethodDto,
} from '../../../types/payment-methods';

const stripePromise = loadStripe(
  `pk_test_51N1NYhCnUuv0cnz82HRdWjJG6BQLt39UMrZtu5TMQwHxHZ78T9OgVOrlCSKInTIsClMaizf2V685PCzsTBphw7zV006mPbh9qN`,
);

type Props = {
  open: boolean;
  onCloseAction: () => void;
  onCreatedAction: () => void;
};

export default function AddPaymentMethodModal({ open, onCloseAction, onCreatedAction }: Props) {
  if (!open) return null;

  return (
    <Elements stripe={stripePromise}>
      <AddPaymentMethodModalInner open={open} onCloseAction={onCloseAction} onCreatedAction={onCreatedAction} />
    </Elements>
  );
}

function AddPaymentMethodModalInner({ onCloseAction: onClose, onCreatedAction: onCreated }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [methodType, setMethodType] = useState<PaymentMethodType>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);

  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);
  const [defaultSelected, setDefaultSelected] = useState(true);

  const [bankName, setBankName] = useState(``);
  const [bankAccount, setBankAccount] = useState(``);
  const [bankRouting, setBankRouting] = useState(``);

  async function createCardMethod() {
    setLoading(true);

    // 1) Create setup intent on backend
    const siRes = await fetch(`/api/stripe/setup-intent`, {
      method: `POST`,
      headers: { 'Content-Type': `application/json` },
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

    const paymentMethodId = confirmRes!.setupIntent.payment_method as string;

    // 3) Retrieve metadata from backend
    const metaRes = await fetch(`/api/stripe/payment-method/metadata`, {
      method: `POST`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify({ paymentMethodId }),
    });

    const cardMeta = await metaRes.json();

    // 3) Save method in Nest backend
    const payload: CreatePaymentMethodDto = {
      type: `CREDIT_CARD`,
      setupIntentId,
      defaultSelected,

      billingName,
      billingEmail,
      billingPhone,

      brand: cardMeta.brand,
      last4: cardMeta.last4,
      expMonth: cardMeta.expMonth,
      expYear: cardMeta.expYear,
    };

    const saveRes = await fetch(`/api/payment-methods`, {
      method: `POST`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify(payload),
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
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify(payload),
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-2">Add payment method</h2>

        {/* Method selector */}
        <div className="flex gap-3">
          <button
            onClick={() => setMethodType(`CREDIT_CARD`)}
            className={`px-3 py-2 rounded-lg border ${
              methodType === `CREDIT_CARD` ? `bg-blue-600 text-white border-blue-600` : `bg-gray-100`
            }`}
          >
            Credit Card
          </button>

          <button
            onClick={() => setMethodType(`BANK_ACCOUNT`)}
            className={`px-3 py-2 rounded-lg border ${
              methodType === `BANK_ACCOUNT` ? `bg-blue-600 text-white border-blue-600` : `bg-gray-100`
            }`}
          >
            Bank Account
          </button>
        </div>

        {/* Billing details */}
        <div className="space-y-3">
          <input
            placeholder="Billing name"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />

          <input
            placeholder="Billing email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />

          <input
            placeholder="Billing phone"
            value={billingPhone}
            onChange={(e) => setBillingPhone(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        {/* Card form */}
        {methodType === `CREDIT_CARD` && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <CardElement className="p-2" />
          </div>
        )}

        {/* Bank form */}
        {methodType === `BANK_ACCOUNT` && (
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <input
              placeholder="Bank name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />

            <input
              placeholder="Account number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />

            <input
              placeholder="Routing number"
              value={bankRouting}
              onChange={(e) => setBankRouting(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={defaultSelected}
            onChange={(e) => setDefaultSelected(e.target.checked)}
            className="h-4 w-4"
          />
          Set as default payment method
        </label>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => !loading && onClose()}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? `Saving...` : `Add method`}
          </button>
        </div>
      </div>
    </div>
  );
}
