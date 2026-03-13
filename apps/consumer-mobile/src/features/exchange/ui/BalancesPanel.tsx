'use client';

import { type IConsumerExchangeBalance } from '@remoola/api-types';

import styles from './BalancesPanel.module.css';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';

interface BalancesPanelProps {
  balances: IConsumerExchangeBalance[];
  onSelectCurrency?: (currency: string) => void;
}

export function BalancesPanel({ balances, onSelectCurrency }: BalancesPanelProps) {
  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (balances.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyInner}>
          <div className={styles.emptyIcon}>
            <CurrencyDollarIcon className={styles.emptyIconSvg} />
          </div>
          <p className={styles.emptyTitle}>No balances</p>
          <p className={styles.emptyText}>Make a payment to see your currency balances</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <UsersIcon className={styles.headerIcon} />
          <h3 className={styles.headerTitle}>Your balances</h3>
        </div>
      </div>

      <div className={styles.list}>
        {balances.map((balance, index) => (
          <button
            key={balance.currency}
            onClick={() => onSelectCurrency?.(balance.currency)}
            className={`${styles.row} ${onSelectCurrency ? styles.rowClickable : styles.rowStatic}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={styles.rowContent}>
              <div className={styles.rowLeft}>
                <div className={styles.iconWrap}>
                  <span className={styles.iconSymbol}>{balance.symbol}</span>
                </div>
                <div>
                  <p className={styles.rowLabel}>{balance.currency}</p>
                  <p className={styles.rowSub}>Available balance</p>
                </div>
              </div>
              <p className={styles.rowAmount}>
                {balance.symbol}
                {formatAmount(balance.amountCents)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <span className={styles.footerText}>
            Total: {balances.length} {balances.length === 1 ? `currency` : `currencies`}
          </span>
          <div className={styles.liveRow}>
            <div className={styles.liveDot} />
            <span className={styles.liveLabel}>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
