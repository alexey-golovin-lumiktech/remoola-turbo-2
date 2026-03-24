'use client';

import { type TCurrencyCode } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { AmountCurrencyInput, type AmountCurrencyInputOption, FormSelect } from '../ui';
import localStyles from './ScheduledConversionModal.module.css';
import styles from '../ui/classNames.module.css';

const {
  exchangeLabel,
  modalButtonPrimary,
  modalButtonSecondary,
  modalCloseButton,
  modalFieldVariant,
  modalFooterActions,
  modalHeaderRow,
  modalOverlayClass,
  modalTitleClass,
} = styles;

type ScheduledConversionModalProps = {
  open: boolean;
  heading: string;
  submitLabel: string;
  loading: boolean;
  currencies: TCurrencyCode[];
  form: {
    fromCurrency: TCurrencyCode;
    toCurrency: TCurrencyCode;
    amount: string;
    executeAt: string;
  };
  onCloseAction: () => void;
  onSubmitAction: () => void;
  onAmountChange: (value: string) => void;
  onFromCurrencyChange: (value: TCurrencyCode) => void;
  onToCurrencyChange: (value: TCurrencyCode) => void;
  onExecuteAtChange: (value: string) => void;
};

export function ScheduledConversionModal({
  open,
  heading,
  submitLabel,
  loading,
  currencies,
  form,
  onCloseAction,
  onSubmitAction,
  onAmountChange,
  onFromCurrencyChange,
  onToCurrencyChange,
  onExecuteAtChange,
}: ScheduledConversionModalProps) {
  if (!open) return null;

  const currencyOptions: AmountCurrencyInputOption[] = currencies.map((currency) => ({
    value: currency,
    label: currency,
  }));

  return (
    <div className={cn(modalOverlayClass, localStyles.modalOverlay)} onClick={onCloseAction}>
      <div className={localStyles.modalBody} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={cn(modalHeaderRow, localStyles.modalHeader)}>
          <h2 className={cn(modalTitleClass, localStyles.modalTitle)}>{heading}</h2>
          <button type="button" onClick={onCloseAction} className={modalCloseButton} aria-label="Close modal">
            ×
          </button>
        </div>

        <div className={localStyles.formBody}>
          <AmountCurrencyInput
            label={`Amount (${form.fromCurrency})`}
            amount={form.amount}
            onAmountChange={onAmountChange}
            currencyCode={form.fromCurrency}
            onCurrencyChange={onFromCurrencyChange}
            currencyOptions={currencyOptions}
            placeholder="0.00"
          />

          <FormSelect
            label="To currency"
            value={form.toCurrency}
            onChange={(value) => onToCurrencyChange(value as TCurrencyCode)}
            options={currencyOptions}
            placeholder="Select currency..."
            isClearable={false}
          />

          <div>
            <label className={exchangeLabel}>Execute at</label>
            <input
              className={modalFieldVariant}
              type="datetime-local"
              value={form.executeAt}
              onChange={(e) => onExecuteAtChange(e.target.value)}
            />
          </div>
        </div>

        <div className={cn(modalFooterActions, localStyles.footerActions)}>
          <button type="button" onClick={onCloseAction} className={modalButtonSecondary}>
            Cancel
          </button>
          <button type="button" onClick={onSubmitAction} disabled={loading} className={modalButtonPrimary}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
