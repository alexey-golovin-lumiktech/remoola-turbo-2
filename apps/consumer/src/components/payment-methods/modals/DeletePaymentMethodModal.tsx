'use client';

import { type PaymentMethodItem } from '../../../types';
import {
  modalButtonDanger,
  modalButtonSecondary,
  modalContentMd,
  modalDangerNoticeClass,
  modalDefaultBadge,
  modalFooterActionsLg,
  modalInfoCard,
  modalInfoSubtext,
  modalInfoTitle,
  modalOverlayClass,
  modalParagraphClass,
  modalTitleClass,
} from '../../ui/classNames';

type DeletePaymentMethodModalProps = {
  open: boolean;
  onCloseAction: () => void;
  onDeletedAction: () => void;
  paymentMethod: PaymentMethodItem | null;
};

export function DeletePaymentMethodModal({
  open,
  onCloseAction,
  onDeletedAction,
  paymentMethod,
}: DeletePaymentMethodModalProps) {
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
    <div className={modalOverlayClass} onClick={() => onCloseAction()}>
      <div className={modalContentMd} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <h2 className={`${modalTitleClass} mb-4`}>Delete payment method</h2>

        {/* BODY */}
        <p className={`${modalParagraphClass} mb-4`}>Are you sure you want to delete this payment method?</p>

        <div className={`${modalInfoCard} p-3 mb-4`}>
          <div className={modalInfoTitle}>
            {paymentMethod.type === `CREDIT_CARD`
              ? `${paymentMethod.brand} •••• ${paymentMethod.last4}`
              : `Bank Account •••• ${paymentMethod.last4}`}
          </div>

          {paymentMethod.expMonth && paymentMethod.expYear && (
            <div className={modalInfoSubtext}>
              Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
            </div>
          )}

          {paymentMethod.defaultSelected && <div className={modalDefaultBadge}>(Default method)</div>}
        </div>

        <p className={modalDangerNoticeClass}>This action cannot be undone.</p>

        {/* FOOTER BUTTONS */}
        <div className={modalFooterActionsLg}>
          <button onClick={onCloseAction} className={modalButtonSecondary}>
            Cancel
          </button>

          <button onClick={handleDelete} className={modalButtonDanger}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
