'use client';

import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';
import 'react-day-picker/dist/style.css';

import { CalendarIcon } from './icons/CalendarIcon';

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * DatePicker - Mobile-first date picker with inline calendar
 *
 * Features:
 * - Inline calendar that opens on click
 * - Mobile-optimized with 44px touch targets
 * - Min/max date validation
 * - Error state support
 * - Dark mode support
 * - Keyboard navigation
 * - WCAG 2.1 AA accessible
 *
 * @example
 * <FormField label="Due date" htmlFor="dueDate">
 *   <DatePicker
 *     id="dueDate"
 *     value={dueDate}
 *     onChange={(value) => setDueDate(value)}
 *     min={new Date().toISOString().split('T')[0]}
 *   />
 * </FormField>
 */
export function DatePicker({
  id,
  value = ``,
  onChange,
  error = false,
  disabled = false,
  min,
  max,
  placeholder = `Select date`,
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Convert string value to Date object
  const selectedDate = value ? new Date(value) : undefined;

  // Handle date selection
  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      // Format as YYYY-MM-DD
      const formatted = format(date, `yyyy-MM-dd`);
      onChange(formatted);
    }
    setIsOpen(false);
  };

  // Convert min/max strings to Date objects
  const minDate = min ? new Date(min) : undefined;
  const maxDate = max ? new Date(max) : undefined;

  // Format display value
  const displayValue = selectedDate ? format(selectedDate, `MMM d, yyyy`) : ``;

  return (
    <div ref={containerRef} className={`relative`}>
      {/* Input trigger */}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label="Select date"
        aria-required={required}
        aria-invalid={error}
        className={`
          min-h-11
          w-full
          rounded-lg
          border
          px-4
          py-2.5
          text-left
          text-base
          transition-colors
          duration-200
          focus:outline-hidden
          focus:ring-2
          focus:ring-offset-2
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${displayValue ? `` : `text-slate-400 dark:text-slate-500`}
          ${
            error
              ? `border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/10 dark:text-red-100`
              : `border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white`
          }
        `}
      >
        <span className={`flex items-center justify-between`}>
          <span>{displayValue || placeholder}</span>
          <CalendarIcon
            className={`ml-2 h-5 w-5 shrink-0 ${error ? `text-red-400 dark:text-red-500` : `text-slate-400 dark:text-slate-500`}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Calendar popover - rendered in portal */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div className={`fixed inset-0 z-40`} onClick={() => setIsOpen(false)} aria-hidden="true" />

            {/* Calendar - positioned absolutely relative to viewport */}
            <div
              style={{
                position: `absolute`,
                top: `${position.top}px`,
                left: `${position.left}px`,
                minWidth: `${position.width}px`,
              }}
              className={`
                z-50
                max-h-[calc(100vh-100px)]
                overflow-auto
                rounded-lg
                border
                border-slate-200
                bg-white
                p-4
                shadow-xl
                dark:border-slate-700
                dark:bg-slate-800
              `}
              role="dialog"
              aria-label="Choose date"
            >
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
                className={`rdp-custom`}
                classNames={{
                  months: `flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0`,
                  month: `space-y-4`,
                  caption: `flex justify-center pt-1 relative items-center`,
                  caption_label: `text-sm font-medium text-slate-900 dark:text-white`,
                  nav: `space-x-1 flex items-center`,
                  nav_button: `h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700`,
                  nav_button_previous: `absolute left-1`,
                  nav_button_next: `absolute right-1`,
                  table: `w-full border-collapse space-y-1`,
                  head_row: `flex`,
                  head_cell: `text-slate-500 dark:text-slate-400 rounded-md w-9 font-normal text-[0.8rem]`,
                  row: `flex w-full mt-2`,
                  cell: `relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary-50 dark:[&:has([aria-selected])]:bg-primary-900/20`,
                  day: `h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md`,
                  day_selected: `bg-primary-600 text-white hover:bg-primary-700 hover:text-white focus:bg-primary-700 focus:text-white dark:bg-primary-600 dark:text-white`,
                  day_today: `bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white`,
                  day_outside: `text-slate-400 opacity-50 dark:text-slate-500`,
                  day_disabled: `text-slate-400 opacity-50 cursor-not-allowed dark:text-slate-500`,
                  day_hidden: `invisible`,
                }}
              />

              {/* Footer with today and clear buttons */}
              <div
                className={`
                mt-3
                flex
                items-center
                justify-between
                border-t
                border-slate-200
                pt-3
                dark:border-slate-700
              `}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(new Date())}
                  className={`
                    rounded-md
                    px-3
                    py-1.5
                    text-sm
                    font-medium
                    text-primary-600
                    hover:bg-primary-50
                    dark:text-primary-400
                    dark:hover:bg-primary-900/20
                  `}
                >
                  Today
                </button>
                {displayValue && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(``);
                      setIsOpen(false);
                    }}
                    className={`
                      rounded-md
                      px-3
                      py-1.5
                      text-sm
                      font-medium
                      text-slate-600
                      hover:bg-slate-100
                      dark:text-slate-400
                      dark:hover:bg-slate-700
                    `}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
