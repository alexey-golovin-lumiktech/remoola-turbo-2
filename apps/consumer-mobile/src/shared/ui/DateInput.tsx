'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@remoola/ui';

import styles from './DateInput.module.css';
import { CalendarIcon } from './icons/CalendarIcon';
import { toDateOnly } from '../../lib/date-utils';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, `type`> {
  error?: boolean;
  showIcon?: boolean;
}

/**
 * DateInput - Mobile-first date input component with calendar icon
 *
 * Features:
 * - 44px minimum touch target (iOS/Android guidelines)
 * - Calendar icon for visual affordance
 * - Error state support with visual feedback
 * - Dark mode support
 * - Consistent styling with FormInput
 *
 * @example
 * <FormField label="Due date" htmlFor="dueDate">
 *   <DateInput
 *     id="dueDate"
 *     value={date}
 *     onChange={(e) => setDate(e.target.value)}
 *     min={new Date().toISOString().split('T')[0]}
 *   />
 * </FormField>
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ error = false, showIcon = true, className = ``, value, defaultValue, ...props }, ref) => {
    const dateValue = value !== undefined ? toDateOnly(String(value)) : undefined;
    const dateDefaultValue = defaultValue !== undefined ? toDateOnly(String(defaultValue)) : undefined;
    return (
      <div className={styles.wrapper}>
        <input
          ref={ref}
          type="date"
          {...props}
          {...(value !== undefined
            ? { value: dateValue }
            : defaultValue !== undefined
              ? { defaultValue: dateDefaultValue }
              : {})}
          className={cn(
            styles.input,
            styles.inputWebkitIndicator,
            showIcon && styles.inputWithIcon,
            error ? styles.error : styles.default,
            className,
          )}
        />
        {showIcon ? (
          <div className={styles.iconWrapper}>
            <CalendarIcon
              className={error ? styles.iconError : styles.iconDefault}
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
        ) : null}
      </div>
    );
  },
);

DateInput.displayName = `DateInput`;
