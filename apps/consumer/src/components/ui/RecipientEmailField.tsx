'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn, XIcon } from '@remoola/ui';

import styles from './classNames.module.css';
import { FormField } from './FormField';

const { formFieldSpacing } = styles;

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

export interface RecipientEmailSuggestion {
  id: string;
  name: string | null;
  email: string;
}

export interface RecipientEmailFieldProps {
  /** Context-specific description shown under the label. Must match the form's purpose. */
  description: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Optional class for the input (e.g. formInputRoundedLg). Defaults to formFieldSpacing. */
  inputClassName?: string;
  /** Optional: called when user explicitly selects a contact from dropdown (for recipient_contact_id). */
  onContactSelect?: (contact: RecipientEmailSuggestion | null) => void;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function RecipientEmailField({
  description,
  value,
  onChange,
  label = `Recipient Email`,
  required = false,
  placeholder,
  inputClassName = formFieldSpacing,
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
    <FormField label={label} description={description}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            type="email"
            required={required}
            className={cn(inputClassName, value && `pr-9`)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => value.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="recipient-email-listbox"
            aria-activedescendant={
              highlightIndex >= 0 && suggestions[highlightIndex]
                ? `recipient-email-option-${suggestions[highlightIndex].id}`
                : undefined
            }
            id="recipient-email-input"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                `absolute`,
                `right-2`,
                `top-1/2`,
                `-translate-y-1/2`,
                `rounded`,
                `p-1`,
                `text-gray-500`,
                `hover:bg-gray-200`,
                `hover:text-gray-700`,
                `dark:text-slate-400`,
                `dark:hover:bg-slate-600`,
                `dark:hover:text-slate-200`,
              )}
              aria-label="Clear"
            >
              <XIcon size={16} className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {showDropdown && (
          <ul
            ref={listboxRef}
            id="recipient-email-listbox"
            role="listbox"
            className={cn(
              `absolute`,
              `z-10`,
              `mt-1`,
              `max-h-60`,
              `w-full`,
              `overflow-auto`,
              `rounded-lg`,
              `border`,
              `border-gray-300`,
              `bg-white`,
              `py-1`,
              `shadow-lg`,
              `dark:border-slate-600`,
              `dark:bg-slate-800`,
            )}
          >
            {loading ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400" role="option">
                Searching…
              </li>
            ) : (
              suggestions.map((contact: RecipientEmailSuggestion, index: number) => {
                const isSelected = exactMatch?.id === contact.id;
                const isHighlighted = index === highlightIndex;
                return (
                  <li
                    key={contact.id}
                    id={`recipient-email-option-${contact.id}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={cn(
                      `cursor-pointer`,
                      `px-3`,
                      `py-2`,
                      `text-sm`,
                      isHighlighted && `bg-blue-100 dark:bg-slate-600`,
                      isSelected && `font-medium`,
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectContact(contact)}
                  >
                    {contact.name ? `${contact.name} — ${contact.email}` : contact.email}
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
