'use client';

import { type TCurrencyCode } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { FormSelect, type FormSelectOption } from '../ui';
import localStyles from './ExchangeRuleModal.module.css';
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

type ExchangeRuleModalProps = {
  open: boolean;
  heading: string;
  submitLabel: string;
  loading: boolean;
  currencies: TCurrencyCode[];
  form: {
    fromCurrency: TCurrencyCode;
    toCurrency: TCurrencyCode;
    targetBalance: string;
    maxConvertAmount: string;
    minIntervalMinutes: string;
    enabled: boolean;
  };
  onCloseAction: () => void;
  onSubmitAction: () => void;
  onFromCurrencyChange: (value: TCurrencyCode) => void;
  onToCurrencyChange: (value: TCurrencyCode) => void;
  onTargetBalanceChange: (value: string) => void;
  onMaxConvertAmountChange: (value: string) => void;
  onMinIntervalMinutesChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
};

const ENABLED_OPTIONS: FormSelectOption[] = [
  { value: `yes`, label: `Yes` },
  { value: `no`, label: `No` },
];

export function ExchangeRuleModal({
  open,
  heading,
  submitLabel,
  loading,
  currencies,
  form,
  onCloseAction,
  onSubmitAction,
  onFromCurrencyChange,
  onToCurrencyChange,
  onTargetBalanceChange,
  onMaxConvertAmountChange,
  onMinIntervalMinutesChange,
  onEnabledChange,
}: ExchangeRuleModalProps) {
  if (!open) return null;

  const currencyOptions = currencies.map((currency) => ({
    value: currency,
    label: currency,
  })) as FormSelectOption[];

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
          <FormSelect
            label="From currency"
            value={form.fromCurrency}
            onChange={(value) => onFromCurrencyChange(value as TCurrencyCode)}
            options={currencyOptions}
            placeholder="Select currency..."
            isClearable={false}
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
            <label className={exchangeLabel}>Target balance</label>
            <input
              className={modalFieldVariant}
              type="number"
              min="0"
              step="0.01"
              value={form.targetBalance}
              onChange={(e) => onTargetBalanceChange(e.target.value)}
            />
          </div>

          <div>
            <label className={exchangeLabel}>Max convert amount (optional)</label>
            <input
              className={modalFieldVariant}
              type="number"
              min="0.01"
              step="0.01"
              value={form.maxConvertAmount}
              onChange={(e) => onMaxConvertAmountChange(e.target.value)}
            />
          </div>

          <div>
            <label className={exchangeLabel}>Min interval (minutes)</label>
            <input
              className={modalFieldVariant}
              type="number"
              min="1"
              step="1"
              value={form.minIntervalMinutes}
              onChange={(e) => onMinIntervalMinutesChange(e.target.value)}
            />
          </div>

          <FormSelect
            label="Enabled"
            value={form.enabled ? `yes` : `no`}
            onChange={(value) => onEnabledChange(value === `yes`)}
            options={ENABLED_OPTIONS}
            placeholder="Enabled"
            isClearable={false}
          />
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
