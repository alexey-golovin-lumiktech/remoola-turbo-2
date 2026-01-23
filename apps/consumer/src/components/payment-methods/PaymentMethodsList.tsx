'use client';

import { CreditCard, Landmark, Star, Pencil, Trash2 } from 'lucide-react';

import { type PaymentMethodItem } from '../../types';

type PaymentMethodsListProps = {
  payments: PaymentMethodItem[];
  onEditAction: (paymentMethod: PaymentMethodItem) => void;
  onDeleteAction: (paymentMethod: PaymentMethodItem) => void;
};

export function PaymentMethodsList({ payments, onEditAction, onDeleteAction }: PaymentMethodsListProps) {
  if (!payments.length) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-400 dark:text-slate-500 mb-4">No payment methods added yet.</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          If you had payment methods that are no longer showing, they may have been updated for security reasons.
          Please add new payment methods using the button above.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((pm) => (
        <PaymentMethodRow key={pm.id} payment={pm} onEdit={onEditAction} onDelete={onDeleteAction} />
      ))}
    </div>
  );
}

/* -----------------------------
   PAYMENT METHOD ROW
------------------------------ */

function PaymentMethodRow({
  payment,
  onEdit,
  onDelete,
}: {
  payment: PaymentMethodItem;
  onEdit: (pm: PaymentMethodItem) => void;
  onDelete: (pm: PaymentMethodItem) => void;
}) {
  const icon = getPaymentMethodIcon(payment);

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-600 shadow-sm hover:shadow transition">
      {/* LEFT */}
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-gray-300">{icon}</div>

        <div className="flex flex-col">
          <div className="font-semibold text-gray-900 dark:text-white">
            {payment.type === `CREDIT_CARD`
              ? `${payment.brand} •••• ${payment.last4}`
              : `Bank Account •••• ${payment.last4}`}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {payment.billingDetails?.name ?? `No billing name`}
          </div>

          {payment.defaultSelected && (
            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full font-medium">
              <Star size={12} /> Default
            </span>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 text-sm">
        <button
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          onClick={() => onEdit(payment)}
        >
          <Pencil size={14} />
          Edit
        </button>

        <button
          className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          onClick={() => onDelete(payment)}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

/* -----------------------------
   HELPER: CARD/BANK ICON PICKER
------------------------------ */

function getPaymentMethodIcon(payment: PaymentMethodItem) {
  if (payment.type === `BANK_ACCOUNT`) {
    return <Landmark size={22} />;
  }

  const brand = payment.brand?.toLowerCase() ?? ``;

  if (brand.includes(`visa`)) return <CreditCard size={22} />;
  if (brand.includes(`mastercard`)) return <CreditCard size={22} />;
  if (brand.includes(`amex`) || brand.includes(`american express`)) return <CreditCard size={22} />;

  return <CreditCard size={22} />;
}
