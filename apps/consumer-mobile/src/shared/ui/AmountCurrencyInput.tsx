'use client';

import { type InputHTMLAttributes, forwardRef, useEffect, useState } from 'react';

import { FormInput } from './FormInput';

interface AmountCurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, `type`> {
  error?: boolean;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
  availableCurrencies?: Array<{ code: string; symbol: string }>;
}

/**
 * AmountCurrencyInput - Combined amount input with currency selector
 * Follows mobile-first design with proper validation and formatting
 */
export const AmountCurrencyInput = forwardRef<HTMLInputElement, AmountCurrencyInputProps>(
  (
    {
      error = false,
      currency = `USD`,
      onCurrencyChange,
      availableCurrencies = [
        { code: `USD`, symbol: `$` },
        { code: `EUR`, symbol: `€` },
        { code: `GBP`, symbol: `£` },
      ],
      className = ``,
      ...props
    },
    ref,
  ) => {
    const [selectedCurrency, setSelectedCurrency] = useState(currency);

    useEffect(() => {
      setSelectedCurrency(currency);
    }, [currency]);

    const handleCurrencyChange = (newCurrency: string) => {
      setSelectedCurrency(newCurrency);
      onCurrencyChange?.(newCurrency);
    };

    // Filter out duplicates and invalid currencies
    const uniqueCurrencies = availableCurrencies.filter(
      (curr, index, self) => curr.code && index === self.findIndex((c) => c.code === curr.code),
    );

    const currentSymbol = uniqueCurrencies.find((c) => c.code === selectedCurrency)?.symbol ?? `$`;

    return (
      <div className={`relative`}>
        <div
          className={`
  pointer-events-none
  absolute
  left-3
  top-1/2
  z-10
  -translate-y-1/2
  text-base
  font-semibold
  text-slate-600
  dark:text-slate-400
          `}
        >
          {currentSymbol}
        </div>

        <FormInput
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          error={error}
          className={`pl-10 pr-24 ${className}`}
          {...props}
        />

        <div
          className={`
  absolute
  right-2
  top-1/2
  z-10
  -translate-y-1/2
          `}
        >
          <select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className={`
  h-10
  min-w-17.5
  appearance-none
  rounded-lg
  border
  border-slate-300
  bg-white
  px-3
  pr-8
  text-sm
  font-semibold
  text-slate-900
  transition-colors
  hover:border-slate-400
  hover:bg-slate-50
  focus:border-primary-500
  focus:outline-hidden
  focus:ring-2
  focus:ring-primary-500
  dark:border-slate-600
  dark:bg-slate-700
  dark:text-white
  dark:hover:bg-slate-600
            `}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: `right 0.5rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1rem 1rem`,
            }}
            aria-label="Currency"
          >
            {uniqueCurrencies.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  },
);

AmountCurrencyInput.displayName = `AmountCurrencyInput`;
