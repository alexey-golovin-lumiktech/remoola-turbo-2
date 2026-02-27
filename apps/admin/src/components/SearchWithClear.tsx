'use client';

import { useId } from 'react';

import styles from './ui/classNames.module.css';

export type SearchWithClearProps = {
  value: string;
  onChangeAction: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  [`aria-label`]?: string;
};

export function SearchWithClear(props: SearchWithClearProps) {
  const { value, onChangeAction: onChange, placeholder, id: idProp, name = `q`, [`aria-label`]: ariaLabel } = props;
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  return (
    <div className={styles.adminSearchInputWrap}>
      <input
        id={id}
        name={name}
        type="search"
        className={`${styles.adminFormInput} ${styles.adminSearchInputWithClear}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? placeholder ?? `Search`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {value.length > 0 ? (
        <button
          type="button"
          className={styles.adminSearchClearBtn}
          onClick={() => onChange(``)}
          aria-label="Clear search"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
