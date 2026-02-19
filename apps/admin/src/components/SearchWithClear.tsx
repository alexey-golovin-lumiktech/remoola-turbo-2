'use client';

import styles from './ui/classNames.module.css';

export type SearchWithClearProps = {
  value: string;
  onChangeAction: (value: string) => void;
  placeholder?: string;
  id?: string;
  [`aria-label`]?: string;
};

export function SearchWithClear(props: SearchWithClearProps) {
  const { value, onChangeAction: onChange, placeholder, id, [`aria-label`]: ariaLabel } = props;
  return (
    <div className={styles.adminSearchInputWrap}>
      <input
        id={id}
        type="search"
        className={`${styles.adminFormInput} ${styles.adminSearchInputWithClear}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? placeholder ?? `Search`}
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
