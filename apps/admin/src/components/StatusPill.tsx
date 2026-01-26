'use client';

import styles from './ui/classNames.module.css';

export function StatusPill({ value }: { value: string }) {
  const isGood = value === `COMPLETED`;
  const isBad = value === `DENIED` || value === `UNCOLLECTIBLE`;
  const cls = isGood ? styles.adminStatusPillGood : isBad ? styles.adminStatusPillBad : styles.adminStatusPillNeutral;

  return <span className={`${styles.adminStatusPillBase} ${cls}`}>{value}</span>;
}
