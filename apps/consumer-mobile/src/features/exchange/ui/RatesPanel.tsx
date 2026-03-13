'use client';

import { useState } from 'react';

import styles from './RatesPanel.module.css';
import { ArrowDownIcon } from '../../../shared/ui/icons/ArrowDownIcon';
import { ArrowUpIcon } from '../../../shared/ui/icons/ArrowUpIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';
import { RefreshIcon } from '../../../shared/ui/icons/RefreshIcon';
import { TrendingUpIcon } from '../../../shared/ui/icons/TrendingUpIcon';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  trend?: `up` | `down` | `stable`;
}

interface RatesPanelProps {
  rates: ExchangeRate[];
}

export function RatesPanel({ rates }: RatesPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch(`/api/exchange/rates`, { cache: `no-store` });
      window.location.reload();
    } catch {
      // Silently handle error - user will see current rates
    } finally {
      setIsRefreshing(false);
    }
  };

  if (rates.length === 0) {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TrendingUpIcon className={styles.headerIcon} strokeWidth={2} />
          <h3 className={styles.headerTitle}>Exchange rates</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={styles.refreshBtn}
          aria-label="Refresh rates"
        >
          <RefreshIcon className={`${styles.refreshIcon} ${isRefreshing ? `animate-spin` : ``}`} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.list}>
        {rates.map((rate, index) => (
          <div key={`${rate.from}-${rate.to}`} className={styles.row} style={{ animationDelay: `${index * 50}ms` }}>
            <div className={styles.rowContent}>
              <div className={styles.pairWrap}>
                <div className={styles.pairBadge}>
                  <span className={styles.pairFrom}>{rate.from}</span>
                  <ChevronRightIcon className={styles.pairArrow} />
                  <span className={styles.pairTo}>{rate.to}</span>
                </div>
              </div>

              <div className={styles.rateWrap}>
                <span className={styles.rateValue}>{rate.rate.toFixed(4)}</span>
                {rate.trend ? (
                  <div className={styles.trendWrap}>
                    {rate.trend === `up` ? (
                      <ArrowUpIcon className={styles.trendUp} />
                    ) : rate.trend === `down` ? (
                      <ArrowDownIcon className={styles.trendDown} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.metaRow}>
              <ClockIcon className={styles.metaIcon} />
              <span className={styles.metaText}>
                {new Date(rate.timestamp).toLocaleTimeString(undefined, {
                  hour: `2-digit`,
                  minute: `2-digit`,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
