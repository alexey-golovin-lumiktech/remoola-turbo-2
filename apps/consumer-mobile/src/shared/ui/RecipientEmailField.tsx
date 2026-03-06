'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FormField } from './FormField';
import { FormInput } from './FormInput';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XIcon } from './icons/XIcon';

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

export interface RecipientEmailSuggestion {
  id: string;
  name: string | null;
  email: string;
}

export interface RecipientEmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  onContactSelect?: (contact: RecipientEmailSuggestion | null) => void;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function RecipientEmailField({
  value,
  onChange,
  label = `Recipient Email`,
  required = false,
  placeholder = `recipient@example.com`,
  error,
  onContactSelect,
}: RecipientEmailFieldProps) {
  const [suggestions, setSuggestions] = useState<RecipientEmailSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const fetchSuggestions = useCallback((query: string) => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    const url = new URL(`/api/contacts`, typeof window !== `undefined` ? window.location.origin : ``);
    url.searchParams.set(`query`, q);
    url.searchParams.set(`limit`, String(SEARCH_LIMIT));

    fetch(url.toString(), { credentials: `include`, cache: `no-store`, signal: abortRef.current.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const list: RecipientEmailSuggestion[] = Array.isArray(data)
          ? (data as RecipientEmailSuggestion[]).filter(
              (c): c is RecipientEmailSuggestion => c && typeof c.id === `string` && typeof c.email === `string`,
            )
          : [];
        setSuggestions(list);
        setHighlightIndex(-1);
      })
      .catch(() => {
        setSuggestions([]);
      })
      .finally(() => {
        setLoading(false);
        abortRef.current = null;
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  const selectContact = useCallback(
    (contact: RecipientEmailSuggestion) => {
      onChange(contact.email);
      onContactSelect?.(contact);
      closeDropdown();
    },
    [onChange, onContactSelect, closeDropdown],
  );

  const handleClear = useCallback(() => {
    onChange(``);
    onContactSelect?.(null);
    setSuggestions([]);
    closeDropdown();
  }, [onChange, onContactSelect, closeDropdown]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) {
        if (e.key === `Escape`) closeDropdown();
        return;
      }
      switch (e.key) {
        case `ArrowDown`:
          e.preventDefault();
          setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
          break;
        case `ArrowUp`:
          e.preventDefault();
          setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
          break;
        case `Enter`:
          e.preventDefault();
          if (highlightIndex >= 0 && suggestions[highlightIndex]) {
            selectContact(suggestions[highlightIndex]);
          }
          break;
        case `Escape`:
          e.preventDefault();
          closeDropdown();
          break;
        default:
          break;
      }
    },
    [open, suggestions, highlightIndex, closeDropdown, selectContact],
  );

  useEffect(() => {
    if (highlightIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: `nearest` });
    }
  }, [highlightIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener(`mousedown`, handleClickOutside);
    return () => document.removeEventListener(`mousedown`, handleClickOutside);
  }, [closeDropdown]);

  const showDropdown = open && (suggestions.length > 0 || loading);
  const exactMatch: RecipientEmailSuggestion | undefined = value.trim()
    ? suggestions.find((c) => normalizeEmail(c.email) === normalizeEmail(value.trim()))
    : undefined;

  return (
    <FormField label={label} htmlFor="recipient-email-input" error={error} required={required}>
      <div ref={containerRef} className={`relative`}>
        <div className={`relative`}>
          <FormInput
            id="recipient-email-input"
            type="email"
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => value.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            error={!!error}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="recipient-email-listbox"
            aria-activedescendant={
              highlightIndex >= 0 && suggestions[highlightIndex]
                ? `recipient-email-option-${suggestions[highlightIndex].id}`
                : undefined
            }
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={`
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                rounded-lg
                p-1.5
                text-slate-400
                transition-colors
                hover:bg-slate-100
                hover:text-slate-600
                dark:hover:bg-slate-700
                dark:hover:text-slate-300
              `}
              aria-label="Clear"
            >
              <XIcon className={`h-5 w-5`} strokeWidth={2} />
            </button>
          )}
        </div>
        {showDropdown && (
          <ul
            ref={listboxRef}
            id="recipient-email-listbox"
            role="listbox"
            className={`
              absolute
              z-50
              mt-2
              max-h-60
              w-full
              overflow-auto
              rounded-lg
              border
              border-slate-200
              bg-white
              py-1
              shadow-lg
              dark:border-slate-700
              dark:bg-slate-800
            `}
          >
            {loading ? (
              <li
                className={`
                px-4
                py-3
                text-sm
                text-slate-500
                dark:text-slate-400
              `}
                role="option"
              >
                <div className={`flex items-center gap-2`}>
                  <SpinnerIcon className={`h-4 w-4`} />
                  Searching contacts...
                </div>
              </li>
            ) : (
              suggestions.map((contact: RecipientEmailSuggestion, index: number) => {
                const isSelected = exactMatch?.id === contact.id;
                const isHighlighted = index === highlightIndex;
                const contactInitial = contact.name?.[0] || contact.email[0] || `?`;
                return (
                  <li
                    key={contact.id}
                    id={`recipient-email-option-${contact.id}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`min-h-[44px] cursor-pointer px-4 py-3 text-sm transition-colors ${
                      isHighlighted
                        ? `bg-primary-50 dark:bg-primary-900/20`
                        : `hover:bg-slate-50 dark:hover:bg-slate-700`
                    } ${isSelected ? `font-semibold` : ``}`}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectContact(contact)}
                  >
                    <div className={`flex items-center gap-2`}>
                      <div
                        className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-primary-100
                        text-xs
                        font-semibold
                        text-primary-700
                        dark:bg-primary-900/30
                        dark:text-primary-300
                      `}
                      >
                        {contactInitial.toUpperCase()}
                      </div>
                      <div className={`min-w-0 flex-1`}>
                        {contact.name ? (
                          <>
                            <div
                              className={`
                              truncate
                              font-medium
                              text-slate-900
                              dark:text-white
                            `}
                            >
                              {contact.name}
                            </div>
                            <div
                              className={`
                              truncate
                              text-xs
                              text-slate-500
                              dark:text-slate-400
                            `}
                            >
                              {contact.email}
                            </div>
                          </>
                        ) : (
                          <div
                            className={`
                            truncate
                            font-medium
                            text-slate-900
                            dark:text-white
                          `}
                          >
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </FormField>
  );
}
