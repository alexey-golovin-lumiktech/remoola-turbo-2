'use client';

import { CreditCardIcon, LandmarkIcon, StarIcon, PencilIcon, TrashIcon } from '@remoola/ui';

import localStyles from './PaymentMethodsList.module.css';
import { type PaymentMethodItem } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  actionButtonDanger,
  actionButtonPrimary,
  emptyStateBody,
  emptyStateCentered,
  emptyStateTitle,
  paymentMethodRow,
  paymentMethodRowIcon,
  paymentMethodRowMeta,
  paymentMethodRowTitle,
} = styles;

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
    <div className={localStyles.listRoot}>
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
      <div className={localStyles.rowLeft}>
        <div className={paymentMethodRowIcon}>{icon}</div>

        <div className={localStyles.rowText}>
          <div className={paymentMethodRowTitle}>
            {payment.type === `CREDIT_CARD`
              ? `${payment.brand} •••• ${payment.last4}`
              : `Bank Account •••• ${payment.last4}`}
          </div>

          <div className={paymentMethodRowMeta}>{payment.billingDetails?.name ?? `No billing name`}</div>

          {payment.defaultSelected && (
            <span className={localStyles.defaultBadge}>
              <StarIcon size={12} /> Default
            </span>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className={localStyles.rowActions}>
        <button
          className={actionButtonPrimary}
          onClick={(e) => (e.stopPropagation(), e.preventDefault(), onEdit(payment))}
        >
          <PencilIcon size={14} />
          Edit
        </button>

        <button
          className={actionButtonDanger}
          onClick={(e) => (e.stopPropagation(), e.preventDefault(), onDelete(payment))}
        >
          <TrashIcon size={14} />
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
    return <LandmarkIcon size={22} />;
  }

  const brand = payment.brand?.toLowerCase() ?? ``;

  if (brand.includes(`visa`)) return <CreditCardIcon size={22} />;
  if (brand.includes(`mastercard`)) return <CreditCardIcon size={22} />;
  if (brand.includes(`amex`) || brand.includes(`american express`)) return <CreditCardIcon size={22} />;

  return <CreditCardIcon size={22} />;
}
