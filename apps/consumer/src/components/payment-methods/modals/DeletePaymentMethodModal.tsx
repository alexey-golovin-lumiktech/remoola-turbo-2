'use client';

import { type PaymentMethodItem } from '../../../types';

type Props = {
  open: boolean;
  onCloseAction: () => void;
  onDeletedAction: () => void;
  paymentMethod: PaymentMethodItem | null;
};

export function DeletePaymentMethodModal({ open, onCloseAction, onDeletedAction, paymentMethod }: Props) {
  if (!open || !paymentMethod) return null;

  async function handleDelete() {
    const res = await fetch(`/api/payment-methods/${paymentMethod!.id}`, {
      method: `DELETE`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    if (res.ok) {
      onDeletedAction();
      onCloseAction();
    } else {
      alert(`Failed to delete payment method`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => onCloseAction()}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <h2 className="text-xl font-semibold mb-4">Delete payment method</h2>

        {/* BODY */}
        <p className="text-gray-700 text-sm mb-4">Are you sure you want to delete this payment method?</p>

        <div className="border rounded-lg p-3 bg-gray-50 mb-4">
          <div className="font-medium">
            {paymentMethod.type === `CREDIT_CARD`
              ? `${paymentMethod.brand} •••• ${paymentMethod.last4}`
              : `Bank Account •••• ${paymentMethod.last4}`}
          </div>

          {paymentMethod.expMonth && paymentMethod.expYear && (
            <div className="text-sm text-gray-500">
              Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
            </div>
          )}

          {paymentMethod.defaultSelected && (
            <div className="text-xs text-green-600 font-medium mt-1">(Default method)</div>
          )}
        </div>

        <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>

        {/* FOOTER BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCloseAction} className="px-4 py-2 rounded-lg hover:bg-gray-100 text-sm">
            Cancel
          </button>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
