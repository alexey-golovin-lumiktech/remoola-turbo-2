'use client';

import { CreditCard, Landmark, Star, Pencil, Trash2 } from 'lucide-react';

import { type PaymentMethodItem } from '../../types';
import {
  actionButtonDanger,
  actionButtonPrimary,
  badgeDefaultInline,
  emptyStateBody,
  emptyStateCentered,
  emptyStateTitle,
  flexCol,
  flexRowGap3,
  flexRowGap4,
  paymentMethodRow,
  paymentMethodRowIcon,
  paymentMethodRowMeta,
  paymentMethodRowTitle,
  spaceY4,
  textSm,
} from '../ui/classNames';

type PaymentMethodsListProps = {
  payments: PaymentMethodItem[];
  onEditAction: (paymentMethod: PaymentMethodItem) => void;
  onDeleteAction: (paymentMethod: PaymentMethodItem) => void;
};

export function PaymentMethodsList({ payments, onEditAction, onDeleteAction }: PaymentMethodsListProps) {
  if (!payments.length) {
    return (
      <div className={emptyStateCentered}>
        <div className={emptyStateTitle}>No payment methods added yet.</div>
        <div className={emptyStateBody}>
          If you had payment methods that are no longer showing, they may have been updated for security reasons. Please
          add new payment methods using the button above.
        </div>
      </div>
    );
  }

  return (
    <div className={spaceY4}>
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
    <div className={paymentMethodRow}>
      {/* LEFT */}
      <div className={flexRowGap4}>
        <div className={paymentMethodRowIcon}>{icon}</div>

        <div className={flexCol}>
          <div className={paymentMethodRowTitle}>
            {payment.type === `CREDIT_CARD`
              ? `${payment.brand} •••• ${payment.last4}`
              : `Bank Account •••• ${payment.last4}`}
          </div>

          <div className={paymentMethodRowMeta}>{payment.billingDetails?.name ?? `No billing name`}</div>

          {payment.defaultSelected && (
            <span className={`mt-1 ${badgeDefaultInline}`}>
              <Star size={12} /> Default
            </span>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className={`${flexRowGap3} ${textSm}`}>
        <button className={actionButtonPrimary} onClick={() => onEdit(payment)}>
          <Pencil size={14} />
          Edit
        </button>

        <button className={actionButtonDanger} onClick={() => onDelete(payment)}>
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
