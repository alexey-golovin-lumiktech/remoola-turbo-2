'use client';

import { type CSSProperties, useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  onBlur?: () => void;
  className?: string;
  inputClassName?: string;
  toggleAriaLabel?: string;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

const WRAPPER_STYLE: CSSProperties = {
  position: `relative`,
  width: `100%`,
  minWidth: 0,
  maxWidth: `100%`,
};

const TOGGLE_BUTTON_STYLE: CSSProperties = {
  position: `absolute`,
  right: `0.5rem`,
  top: `50%`,
  transform: `translateY(-50%)`,
  zIndex: 1,
  display: `inline-flex`,
  alignItems: `center`,
  justifyContent: `center`,
  minWidth: 0,
  minHeight: 0,
  padding: `0.25rem`,
  border: 0,
  background: `transparent`,
  cursor: `pointer`,
  lineHeight: 1,
};

export function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
  name,
  autoComplete,
  onBlur,
  className,
  inputClassName,
  toggleAriaLabel,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const styles = {
    input: `
      w-full
      min-w-0
      box-border
      rounded-md
      border
      px-3
      py-2
      text-sm
      bg-white
      dark:bg-slate-800
      text-gray-900
      dark:text-white
      border-gray-300
      dark:border-slate-600
      placeholder:text-gray-400
      dark:placeholder:text-gray-500
      focus:outline-hidden
      focus:ring-2
      focus:ring-blue-500
    `,
    toggleButton: `
      absolute
      right-2
      top-1/2
      -translate-y-1/2
      z-10
      inline-flex
      min-h-0
      min-w-0
      items-center
      justify-center
      text-xs
      leading-none
      text-gray-500
      dark:text-gray-400
      hover:text-gray-700
      dark:hover:text-gray-200
      cursor-pointer
      rounded-xs
      px-1
      py-1
      focus:outline-hidden
      focus:ring-2
      focus:ring-blue-500
    `,
  };

  return (
    <div
      className={joinClasses(
        `
          relative
          w-full
          min-w-0
      max-w-full
        `,
        className,
      )}
      style={WRAPPER_STYLE}
    >
      <input
        id={id ?? name}
        type={show ? `text` : `password`}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={joinClasses(styles.input, inputClassName, `pr-14`)}
        style={{ paddingRight: `3.5rem` }}
      />

      <button
        type="button"
        aria-pressed={show}
        aria-label={toggleAriaLabel ?? (show ? `Hide password` : `Show password`)}
        onMouseDown={(e) => {
          // Keep focus on the input while toggling visibility.
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow((show) => !show);
        }}
        className={styles.toggleButton}
        style={TOGGLE_BUTTON_STYLE}
      >
        {show ? `Hide` : `Show`}
      </button>
    </div>
  );
}
