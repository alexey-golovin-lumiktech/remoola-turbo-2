'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import styles from './classNames.module.css';
import { getUserLocale } from '../../lib/date-utils';

const { errorTextClass, formInputFullWidth, formInputError } = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

export interface DateInputProps {
  label: string;
  value?: string | Date | null;
  onChange?: (date: string | null) => void;
  error?: string;
  onErrorClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const DateInput = ({
  label,
  value,
  onChange,
  error,
  onErrorClear,
  placeholder,
  disabled,
  required,
  className,
}: DateInputProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  });

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    // Convert to YYYY-MM-DD format for consistency
    const dateString = date ? date.toISOString().split(`T`)[0] : null;
    onChange?.(dateString ?? null);

    // Clear error when date is selected
    if (date && error && onErrorClear) {
      onErrorClear();
    }
  };

  // Get locale-specific date format for display
  const locale = getUserLocale();
  const dateFormat = getDateFormatForLocale(locale);

  return (
    <div>
      <label className={styles.signupStepLabel}>{label}</label>
      <div className="relative">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat={dateFormat}
          placeholderText={placeholder || `Select date`}
          disabled={disabled}
          required={required}
          className={joinClasses(formInputFullWidth, error && formInputError, className)}
          wrapperClassName="w-full"
          popperClassName="z-50"
          calendarClassName="shadow-lg border border-gray-200"
        />
      </div>
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
};

// Helper function to get appropriate date format for locale
function getDateFormatForLocale(locale: string): string {
  // Use DD.MM.YYYY for locales that prefer this format
  const ddmmyyyyLocales = [
    `ru`,
    `de`,
    `fr`,
    `es`,
    `it`,
    `pt`,
    `nl`,
    `sv`,
    `da`,
    `no`,
    `fi`,
    `pl`,
    `cs`,
    `sk`,
    `hu`,
    `hr`,
    `sl`,
    `bg`,
    `ro`,
    `tr`,
  ];

  if (ddmmyyyyLocales.includes(locale)) {
    return `dd.MM.yyyy`;
  }

  // Default to MM/dd/yyyy for en and others
  return `MM/dd/yyyy`;
}
