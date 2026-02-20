'use client';

import { useId, useState } from 'react';
import Select, { type SingleValue } from 'react-select';

import { ALL_CURRENCY_CODES, getCurrencySymbol, type TCurrencyCode } from '@remoola/api-types';

import { FormField } from './FormField';
import { formatMonetaryDisplay, maskMonetary } from '../../lib/monetary';
import { useTheme } from '../ThemeProvider';
import styles from './classNames.module.css';

const {
  amountCurrencyAmountPart,
  amountCurrencyDivider,
  amountCurrencyInput,
  amountCurrencyInputNoPrefix,
  amountCurrencySelectWidth,
  amountCurrencyWrapper,
  inputPrefixIcon,
} = styles;

const DEFAULT_CURRENCY_OPTIONS = ALL_CURRENCY_CODES.map((c) => ({ value: c, label: c }));

export interface AmountCurrencyInputOption {
  value: string;
  label: string;
}

export interface AmountCurrencyInputProps {
  /** Label above the control (e.g. "Amount (EUR)"). Defaults to "Amount ({currencyCode})". */
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** Raw amount string (e.g. "123.45"). */
  amount: string;
  onAmountChange: (value: string) => void;
  currencyCode: TCurrencyCode;
  onCurrencyChange: (value: TCurrencyCode) => void;
  /** Currency options for the select. Defaults to all supported currencies. */
  currencyOptions?: AmountCurrencyInputOption[];
  required?: boolean;
  placeholder?: string;
  id?: string;
  /** Stable id for react-select (SSR/hydration). */
  instanceId?: string;
}

export function AmountCurrencyInput({
  label,
  description,
  amount,
  onAmountChange,
  currencyCode,
  onCurrencyChange,
  currencyOptions = DEFAULT_CURRENCY_OPTIONS,
  required = false,
  placeholder = `0.00`,
  id: idProp,
  instanceId: instanceIdProp,
}: AmountCurrencyInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === `dark`;
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const reactSelectId = instanceIdProp ?? `${id}-currency`;
  const [amountFocused, setAmountFocused] = useState(false);

  const selectedOption =
    currencyCode && currencyOptions.find((o) => o.value === currencyCode)
      ? { value: currencyCode, label: currencyCode }
      : null;

  const handleCurrencyChange = (opt: SingleValue<AmountCurrencyInputOption>) => {
    const v = opt?.value ?? ``;
    if ((ALL_CURRENCY_CODES as readonly string[]).includes(v)) {
      onCurrencyChange(v as TCurrencyCode);
    }
  };

  const displayLabel = label ?? `Amount (${currencyCode})`;
  const symbol = getCurrencySymbol(currencyCode);
  const showSymbol = symbol !== currencyCode;

  return (
    <FormField label={displayLabel} description={description}>
      <div className={amountCurrencyWrapper} id={id}>
        <div className={amountCurrencyAmountPart}>
          {showSymbol && (
            <span className={inputPrefixIcon} aria-hidden>
              {symbol}
            </span>
          )}
          <input
            type="text"
            inputMode="decimal"
            required={required}
            className={showSymbol ? amountCurrencyInput : amountCurrencyInputNoPrefix}
            value={amountFocused ? amount : formatMonetaryDisplay(amount)}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            onChange={(e) => onAmountChange(maskMonetary(e.target.value))}
            placeholder={placeholder}
            aria-label={typeof displayLabel === `string` ? displayLabel : `Amount`}
          />
        </div>
        <div className={amountCurrencyDivider} aria-hidden />
        <div className={amountCurrencySelectWidth}>
          <Select<AmountCurrencyInputOption>
            instanceId={reactSelectId}
            isClearable={false}
            isSearchable
            options={currencyOptions}
            value={selectedOption}
            onChange={handleCurrencyChange}
            placeholder={currencyCode || `USD`}
            menuPortalTarget={typeof document !== `undefined` ? document.body : undefined}
            menuPosition="fixed"
            filterOption={(option, input) =>
              option.label.toLowerCase().includes(input.toLowerCase()) ||
              option.value.toLowerCase().includes(input.toLowerCase())
            }
            classNames={{
              control: () =>
                [
                  `!min-h-[42px] !h-[42px] !rounded-none !border-0 !border-l`,
                  `!border-gray-300 dark:!border-slate-600 !bg-transparent !shadow-none`,
                ].join(` `),
              valueContainer: () => `!py-0 !px-3`,
            }}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: 42,
                height: 42,
                padding: 0,
                backgroundColor: `transparent`,
                border: `none`,
                borderLeft: `1px solid ${isDark ? `rgb(71 85 105)` : `rgb(209 213 219)`}`,
                borderRadius: 0,
                boxShadow: `none`,
              }),
              valueContainer: (base) => ({
                ...base,
                padding: `8px 12px`,
              }),
              singleValue: (base) => ({
                ...base,
                color: isDark ? `rgb(248 250 252)` : base.color,
              }),
              input: (base) => ({
                ...base,
                color: isDark ? `rgb(248 250 252)` : base.color,
              }),
              placeholder: (base) => ({
                ...base,
                color: isDark ? `rgb(148 163 184)` : base.color,
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: isDark ? `rgb(30 41 59)` : base.backgroundColor,
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor:
                  state.isFocused && isDark
                    ? `rgb(51 65 85)`
                    : state.isFocused
                      ? base.backgroundColor
                      : base.backgroundColor,
                color: isDark ? `rgb(248 250 252)` : base.color,
              }),
            }}
          />
        </div>
      </div>
    </FormField>
  );
}
