'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { emailOptionalSchema } from '@remoola/api-types';

import localStyles from './EditPaymentMethodModal.module.css';
import { type PaymentMethodItem } from '../../../types';
import styles from '../../ui/classNames.module.css';

const {
  checkboxSmall,
  modalButtonPrimary,
  modalButtonSecondary,
  modalFieldVariant,
  modalFooterActions,
  modalHeaderRow,
  modalMetaLabel,
  modalMetaValue,
  modalOverlayClass,
  modalTitleClass,
  modalCloseButton,
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
    const trimmedBillingEmail = billingEmail.trim();
    let billingEmailToSend = ``;
    if (trimmedBillingEmail) {
      const parsed = emailOptionalSchema.safeParse(trimmedBillingEmail);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? `Enter a valid billing email`);
        return;
      }
      billingEmailToSend = parsed.data;
    }
    setSaving(true);

    const res = await fetch(`/api/payment-methods/${paymentMethod!.id}`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        billingName,
        billingEmail: billingEmailToSend,
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
      <div className={localStyles.modalBody} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={modalHeaderRow}>
          <h2 className={modalTitleClass}>Edit Payment Method</h2>
          <button onClick={closeIfAllowed} className={modalCloseButton}>
            ×
          </button>
        </div>

        {/* Metadata block (non-editable) */}
        <div className={localStyles.metaCard}>
          <div className={modalMetaLabel}>Type:</div>
          <div className={localStyles.typeValue}>
            {paymentMethod.type === `CREDIT_CARD` ? `Credit Card` : `Bank Account`}
          </div>

          <div className={modalMetaLabel}>Details:</div>
          <div className={modalMetaValue}>
            {paymentMethod.brand} •••• {paymentMethod.last4}
          </div>

          {paymentMethod.expMonth && paymentMethod.expYear && (
            <div className={localStyles.expiresNote}>
              Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className={localStyles.editableFields}>
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

          <label className={localStyles.defaultCheckboxLabel}>
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
