'use client';

import { CreditCard, Landmark, Star, Pencil, Trash2 } from 'lucide-react';

import { type PaymentMethodItem } from '../../types/payment-methods';

type Props = {
  items: PaymentMethodItem[];
  onEditAction: (item: PaymentMethodItem) => void;
  onDeleteAction: (item: PaymentMethodItem) => void;
};

export function PaymentMethodsList({ items, onEditAction, onDeleteAction }: Props) {
  if (!items.length) {
    return <div className="text-center text-gray-400 py-10">No payment methods added yet.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((pm) => (
        <PaymentMethodRow key={pm.id} item={pm} onEdit={onEditAction} onDelete={onDeleteAction} />
      ))}
    </div>
  );
}

/* -----------------------------
   PAYMENT METHOD ROW
------------------------------ */

function PaymentMethodRow({
  item,
  onEdit,
  onDelete,
}: {
  item: PaymentMethodItem;
  onEdit: (pm: PaymentMethodItem) => void;
  onDelete: (pm: PaymentMethodItem) => void;
}) {
  const icon = getPaymentMethodIcon(item);

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border shadow-sm hover:shadow transition">
      {/* LEFT */}
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">{icon}</div>

        <div className="flex flex-col">
          <div className="font-semibold">
            {item.type === `CREDIT_CARD` ? `${item.brand} •••• ${item.last4}` : `Bank Account •••• ${item.last4}`}
          </div>

          <div className="text-sm text-gray-500">{item.billingDetails?.name ?? `No billing name`}</div>

          {item.defaultSelected && (
            <span
              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700
            rounded-full font-medium"
            >
              <Star size={12} /> Default
            </span>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 text-sm">
        <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800" onClick={() => onEdit(item)}>
          <Pencil size={14} />
          Edit
        </button>

        <button className="flex items-center gap-1 text-red-500 hover:text-red-700" onClick={() => onDelete(item)}>
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

function getPaymentMethodIcon(item: PaymentMethodItem) {
  if (item.type === `BANK_ACCOUNT`) {
    return <Landmark size={22} />;
  }

  const brand = item.brand?.toLowerCase() ?? ``;

  if (brand.includes(`visa`)) return <CreditCard size={22} />;
  if (brand.includes(`mastercard`)) return <CreditCard size={22} />;
  if (brand.includes(`amex`) || brand.includes(`american express`)) return <CreditCard size={22} />;

  return <CreditCard size={22} />;
}
