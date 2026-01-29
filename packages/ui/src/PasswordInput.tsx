'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  className?: string;
  inputClassName?: string;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

export function PasswordInput({ value, onChange, placeholder, name, className, inputClassName }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const styles = {
    input: `
      w-full
      min-w-0
      box-border
      pr-12
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
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
    `,
    toggleButton: `
      absolute
      right-3
      top-1/2
      -translate-y-1/2
      z-10
      text-xs
      text-gray-500
      dark:text-gray-400
      hover:text-gray-700
      dark:hover:text-gray-200
    `,
  };

  return (
    <div className={joinClasses(`relative w-full min-w-0 max-w-full overflow-hidden`, className)}>
      <input
        type={show ? `text` : `password`}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={joinClasses(styles.input, inputClassName)}
      />

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow((show) => !show);
        }}
        className={styles.toggleButton}
      >
        {show ? `Hide` : `Show`}
      </button>
    </div>
  );
}
