'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  inputClassName?: string;
  wrapperClassName?: string;
}

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

export function PasswordInput({
  value,
  onChange,
  placeholder,
  name,
  inputClassName,
  wrapperClassName,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={wrapperClassName} style={{ position: `relative`, width: `100%` }}>
      <input
        type={show ? `text` : `password`}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={joinClasses(`w-full pr-12`, inputClassName)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow((prev) => !prev);
        }}
        style={{
          position: `absolute`,
          right: `0.75rem`,
          top: `50%`,
          transform: `translateY(-50%)`,
          fontSize: `0.75rem`,
        }}
      >
        {show ? `Hide` : `Show`}
      </button>
    </div>
  );
}
