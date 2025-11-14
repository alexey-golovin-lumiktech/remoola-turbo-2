import { type ChangeEvent, useState } from 'react';

import { Input } from '@remoola/ui/Input';
interface PasswordInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export function PasswordInput({ value, onChange, placeholder }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative w-full">
      <Input
        type={show ? `text` : `password`}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        name="password"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => setShow((x) => !x)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
      >
        {show ? `🙈` : `👁️`}
      </button>
    </div>
  );
}
