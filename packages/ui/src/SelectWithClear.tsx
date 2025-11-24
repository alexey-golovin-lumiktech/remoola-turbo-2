'use client';

import { useEffect, useRef, useState } from 'react';

export interface Option<T extends string | null> {
  label: string;
  value: T;
}

interface SelectWithClearProps<T extends string | null> {
  label?: string;
  value: T | null;
  onChange: (value: T | null) => void;

  options: Option<T>[];
  placeholder?: string;

  showNotSelected?: boolean;
  showOtherField?: boolean;
  otherValue?: string | null;
  onChangeOther?: (value: string) => void;
}

export function SelectWithClear<T extends string | null>({
  label,
  value,
  onChange,
  options,
  placeholder = `Not Selected`,

  showNotSelected = true,
  showOtherField = false,
  otherValue,
  onChangeOther,
}: SelectWithClearProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const isOther = value === `Other`;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener(`mousedown`, handler);
    return () => window.removeEventListener(`mousedown`, handler);
  }, []);

  const handleSelect = (v: T | null) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full space-y-2">
      {label && <label className="text-xs font-medium text-gray-700 block">{label}</label>}

      {/* TRIGGER */}
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((open) => !open);
        }}
        className={`
          relative w-full border rounded px-3 py-2 bg-white text-sm
          cursor-pointer select-none flex items-center justify-between
        `}
      >
        <span className={value ? `text-gray-900` : `text-gray-400`}>{value ?? placeholder}</span>

        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(null);
            }}
            className="text-gray-500 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        ) : (
          <button type="button" className="text-gray-500 hover:text-gray-700 text-lg  pointer-events-none">
            {open ? `▲` : `▼`}
          </button>
        )}
      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div
          style={{ zIndex: 100 }}
          className="absolute left-0 right-0 mt-1
            bg-white border shadow-lg
            rounded-b-lg
            max-h-72 overflow-auto"
        >
          {/* Placeholder */}
          {showNotSelected && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(null);
              }}
              className="
              px-3 py-2 text-sm text-gray-500
              cursor-pointer hover:bg-gray-100
            "
            >
              {placeholder}
            </div>
          )}

          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(opt.value);
              }}
              className={`
                px-3 py-2 text-sm cursor-pointer
                ${value === opt.value ? `bg-blue-50 text-blue-600` : `hover:bg-gray-100`}
              `}
            >
              {opt.label}
            </div>
          ))}

          {showOtherField && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(`Other` as T);
              }}
              className={`
                px-3 py-2 text-sm cursor-pointer
                ${value === `Other` ? `bg-blue-50 text-blue-600` : `hover:bg-gray-100`}
              `}
            >
              Other
            </div>
          )}
        </div>
      )}

      {/* Other input */}
      {showOtherField && isOther && (
        <input
          type="text"
          value={otherValue ?? `\u00a0`}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChangeOther?.(e.target.value);
          }}
          placeholder="Please specify..."
          className="border rounded px-3 py-2 text-sm w-full"
        />
      )}
    </div>
  );
}
