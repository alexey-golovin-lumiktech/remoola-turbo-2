'use client';

import { cn } from '@remoola/ui';

import { SearchIcon } from './icons/SearchIcon';
import { XIcon } from './icons/XIcon';
import styles from './SearchInput.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onClear?: () => void;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = `Search...`,
  ariaLabel,
  onClear,
  className = ``,
}: SearchInputProps) {
  const handleClear = () => {
    onChange(``);
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.iconWrap}>
        <SearchIcon className={styles.icon} strokeWidth={2} />
      </div>
      <input
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
      />
      {value ? (
        <button type="button" onClick={handleClear} className={styles.clearButton} aria-label="Clear search">
          <XIcon className={styles.clearIcon} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
