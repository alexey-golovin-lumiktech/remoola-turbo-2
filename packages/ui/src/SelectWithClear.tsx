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
    <div ref={wrapperRef} className="rm-select">
      {label && <label className="rm-select__label">{label}</label>}

      {/* TRIGGER */}
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((open) => !open);
        }}
        className="rm-select__trigger"
      >
        <span className={value ? `rm-select__value` : `rm-select__placeholder`}>
          {options.find((x) => x.value === value)?.label ?? value ?? placeholder}
        </span>

        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(null);
            }}
            className="rm-select__clear"
          >
            ×
          </button>
        ) : (
          <button type="button" className="rm-select__chevron pointer-events-none">
            {open ? `▲` : `▼`}
          </button>
        )}
      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="rm-select__menu">
          {/* Placeholder */}
          {showNotSelected && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(null);
              }}
              className="rm-select__option rm-select__option--placeholder"
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
              className={`rm-select__option ${value === opt.value ? `rm-select__option--active` : ``}`}
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
              className={`rm-select__option ${value === `Other` ? `rm-select__option--active` : ``}`}
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
          className="rm-select__other-input"
        />
      )}
    </div>
  );
}
