'use client';

import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';

import { cn } from '@remoola/ui';

import styles from './DatePicker.module.css';
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
    <div ref={containerRef} className={styles.container}>
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
        className={cn(
          styles.trigger,
          !displayValue && styles.triggerPlaceholder,
          error ? styles.triggerError : styles.triggerDefault,
        )}
      >
        <span className={styles.triggerInner}>
          <span>{displayValue || placeholder}</span>
          <CalendarIcon
            className={error ? styles.calendarIconError : styles.calendarIconDefault}
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
            <div className={styles.backdrop} onClick={() => setIsOpen(false)} aria-hidden="true" />

            {/* Calendar - positioned absolutely relative to viewport */}
            <div
              style={{
                position: `absolute`,
                top: `${position.top}px`,
                left: `${position.left}px`,
                minWidth: `${position.width}px`,
              }}
              className={styles.popover}
              role="dialog"
              aria-label="Choose date"
            >
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
                className="rdp-custom"
                classNames={{
                  months: styles.rdpMonths,
                  month: styles.rdpMonth,
                  caption: styles.rdpCaption,
                  caption_label: styles.rdpCaptionLabel,
                  nav: styles.rdpNav,
                  nav_button: styles.rdpNavButton,
                  nav_button_previous: styles.rdpNavButtonPrevious,
                  nav_button_next: styles.rdpNavButtonNext,
                  table: styles.rdpTable,
                  head_row: styles.rdpHeadRow,
                  head_cell: styles.rdpHeadCell,
                  row: styles.rdpRow,
                  cell: styles.rdpCell,
                  day: styles.rdpDay,
                  day_selected: styles.rdpDaySelected,
                  day_today: styles.rdpDayToday,
                  day_outside: styles.rdpDayOutside,
                  day_disabled: styles.rdpDayDisabled,
                  day_hidden: styles.rdpDayHidden,
                }}
              />

              {/* Footer with today and clear buttons */}
              <div className={styles.footer}>
                <button type="button" onClick={() => handleSelect(new Date())} className={styles.todayBtn}>
                  Today
                </button>
                {displayValue ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(``);
                      setIsOpen(false);
                    }}
                    className={styles.clearBtn}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
