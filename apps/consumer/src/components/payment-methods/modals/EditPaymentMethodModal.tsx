'use client';

import { useEffect, useState } from 'react';

import { type PaymentMethodItem } from '../../../types';
import styles from '../../ui/classNames.module.css';

const {
  checkboxSmall,
  flexRowItemsCenter,
  gap2,
  mb2,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentLg,
  modalFieldVariant,
  modalFooterActions,
  modalHeaderRow,
  modalInfoCard,
  modalInfoSubtext,
  modalMetaLabel,
  modalMetaValue,
  modalOverlayClass,
  modalTitleClass,
  modalCloseButton,
  mt1,
  mt3,
  p4,
  spaceY3,
  textSm,
  textMutedGrayStrong,
} = styles;

type EditPaymentMethodModalProps = {
  open: boolean;
  onCloseAction: () => void;
  onUpdatedAction: () => void;
  paymentMethod: PaymentMethodItem | null;
};

export function EditPaymentMethodModal({
  open,
  onCloseAction: onClose,
  onUpdatedAction: onUpdated,
  paymentMethod: paymentMethod,
}: EditPaymentMethodModalProps) {
  const [billingName, setBillingName] = useState(``);
  const [billingEmail, setBillingEmail] = useState(``);
  const [billingPhone, setBillingPhone] = useState(``);
  const [defaultSelected, setDefaultSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Load paymentMethod data on open */
  useEffect(() => {
    if (paymentMethod) {
      setBillingName(paymentMethod.billingDetails?.name ?? ``);
      setBillingEmail(paymentMethod.billingDetails?.email ?? ``);
      setBillingPhone(paymentMethod.billingDetails?.phone ?? ``);
      setDefaultSelected(paymentMethod.defaultSelected ?? false);
    }
  }, [paymentMethod]);

  if (!open || !paymentMethod) return null;

  async function handleSave() {
    setSaving(true);

    const res = await fetch(`/api/payment-methods/${paymentMethod!.id}`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        billingName,
        billingEmail,
        billingPhone,
        defaultSelected,
      }),
      credentials: `include`,
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
    <div className={modalOverlayClass} onClick={closeIfAllowed}>
      <div className={`${modalContentLg} space-y-5`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={modalHeaderRow}>
          <h2 className={modalTitleClass}>Edit payment method</h2>
          <button onClick={closeIfAllowed} className={modalCloseButton}>
            ×
          </button>
        </div>

        {/* Metadata block (non-editable) */}
        <div className={`${modalInfoCard} ${p4}`}>
          <div className={modalMetaLabel}>Type:</div>
          <div className={`${modalMetaValue} ${mb2}`}>
            {paymentMethod.type === `CREDIT_CARD` ? `Credit Card` : `Bank Account`}
          </div>

          <div className={modalMetaLabel}>Details:</div>
          <div className={modalMetaValue}>
            {paymentMethod.brand} •••• {paymentMethod.last4}
          </div>

          {paymentMethod.expMonth && paymentMethod.expYear && (
            <div className={`${modalInfoSubtext} ${mt1}`}>
              Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
            </div>
          )}
        </div>

        {/* Editable fields */}
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

          <label className={`${flexRowItemsCenter} ${gap2} ${textSm} ${mt3} ${textMutedGrayStrong}`}>
            <input
              type="checkbox"
              checked={defaultSelected}
              onChange={(e) => setDefaultSelected(e.target.checked)}
              className={checkboxSmall}
            />
            <span>Set as default payment method</span>
          </label>
        </div>

        {/* Footer buttons */}
        <div className={modalFooterActions}>
          <button onClick={closeIfAllowed} disabled={saving} className={modalButtonSecondary}>
            Cancel
          </button>

          <button onClick={handleSave} disabled={saving} className={modalButtonPrimary}>
            {saving ? `Saving...` : `Save changes`}
          </button>
        </div>
      </div>
    </div>
  );
}
