'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

import { CalendarIcon } from './icons/CalendarIcon';

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
  ({ error = false, showIcon = true, className = ``, ...props }, ref) => {
    return (
      <div className={`relative`}>
        <input
          ref={ref}
          type="date"
          className={`
            min-h-11
            w-full
            rounded-lg
            border
            px-4
            py-2.5
            text-base
            transition-colors
            duration-200
            placeholder:text-slate-400
            focus:outline-hidden
            focus:ring-2
            focus:ring-offset-2
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:placeholder:text-slate-500
            [&::-webkit-calendar-picker-indicator]:absolute
            [&::-webkit-calendar-picker-indicator]:right-0
            [&::-webkit-calendar-picker-indicator]:h-full
            [&::-webkit-calendar-picker-indicator]:w-10
            [&::-webkit-calendar-picker-indicator]:cursor-pointer
            [&::-webkit-calendar-picker-indicator]:opacity-0
            ${showIcon ? `pr-10` : ``}
            ${
              error
                ? `border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/10 dark:text-red-100`
                : `border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white`
            }
            ${className}
          `}
          {...props}
        />
        {showIcon && (
          <div
            className={`
            pointer-events-none
            absolute
            inset-y-0
            right-0
            flex
            items-center
            pr-3
          `}
          >
            <CalendarIcon
              className={`h-5 w-5 ${error ? `text-red-400 dark:text-red-500` : `text-slate-400 dark:text-slate-500`}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    );
  },
);

DateInput.displayName = `DateInput`;
