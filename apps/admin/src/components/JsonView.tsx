'use client';

import styles from './ui/classNames.module.css';

export function JsonView({ value }: { value: unknown }) {
  return <pre className={styles.adminJsonView}>{JSON.stringify(value, null, 2)}</pre>;
}
