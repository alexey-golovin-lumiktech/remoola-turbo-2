'use client';

import { useEffect, useState } from 'react';

import { type PaymentMethodItem } from '../../../types/payment-methods';

type Props = {
  open: boolean;
  onCloseAction: () => void;
  onUpdatedAction: () => void;
  item: PaymentMethodItem | null;
};

export default function EditPaymentMethodModal({
  open,
  onCloseAction: onClose,
  onUpdatedAction: onUpdated,
  item,
}: Props) {
  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);
  const [defaultSelected, setDefaultSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Load item data on open */
  useEffect(() => {
    if (item) {
      setBillingName(item.billingDetails?.name ?? ``);
      setBillingEmail(item.billingDetails?.email ?? ``);
      setBillingPhone(item.billingDetails?.phone ?? ``);
      setDefaultSelected(item.defaultSelected ?? false);
    }
  }, [item]);

  if (!open || !item) return null;

  async function handleSave() {
    setSaving(true);

    const authorization = localStorage.getItem(`authorization`) || ``;

    const res = await fetch(`/api/payment-methods/${item!.id}`, {
      method: `PATCH`,
      headers: {
        authorization,
        'Content-Type': `application/json`,
      },
      body: JSON.stringify({
        billingName,
        billingEmail,
        billingPhone,
        defaultSelected,
      }),
    });

    setSaving(false);

    if (res.ok) {
      onUpdated();
      onClose();
    }
  }

  function closeIfAllowed() {
    if (!saving) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-opacity"
      onClick={closeIfAllowed}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-5 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit payment method</h2>
          <button onClick={closeIfAllowed} className="text-2xl leading-none px-2 text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        {/* Metadata block (non-editable) */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="text-sm text-gray-600">Type:</div>
          <div className="font-medium mb-2">{item.type === `CREDIT_CARD` ? `Credit Card` : `Bank Account`}</div>

          <div className="text-sm text-gray-600">Details:</div>
          <div className="font-medium">
            {item.brand} •••• {item.last4}
          </div>

          {item.expMonth && item.expYear && (
            <div className="text-sm text-gray-500 mt-1">
              Expires {item.expMonth}/{item.expYear}
            </div>
          )}
        </div>

        {/* Editable fields */}
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

          <label className="flex items-center gap-2 text-sm mt-3">
            <input
              type="checkbox"
              checked={defaultSelected}
              onChange={(e) => setDefaultSelected(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Set as default payment method</span>
          </label>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={closeIfAllowed}
            disabled={saving}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? `Saving...` : `Save changes`}
          </button>
        </div>
      </div>
    </div>
  );
}
