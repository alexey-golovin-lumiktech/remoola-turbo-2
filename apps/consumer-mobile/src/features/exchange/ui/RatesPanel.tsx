'use client';

import { useState } from 'react';

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
    <div
      className={`
      overflow-hidden
      rounded-2xl
      border
      border-slate-700
      bg-slate-800/90
      shadow-lg
    `}
    >
      <div
        className={`
        flex
        items-center
        justify-between
        border-b
        border-slate-700
        bg-gradient-to-r
        from-slate-800
        to-slate-900
        px-5
        py-4
      `}
      >
        <div className={`flex items-center gap-2`}>
          <TrendingUpIcon className={`h-5 w-5 text-primary-400`} strokeWidth={2} />
          <h3 className={`text-base font-bold text-slate-100`}>Exchange rates</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            flex
            min-h-[44px]
            min-w-[44px]
            items-center
            justify-center
            rounded-xl
            text-primary-400
            transition-all
            hover:bg-slate-700
            focus:outline-none
            focus:ring-2
            focus:ring-primary-500
            disabled:opacity-50
            active:scale-95
          `}
          aria-label="Refresh rates"
        >
          <RefreshIcon className={`h-5 w-5 ${isRefreshing ? `animate-spin` : ``}`} strokeWidth={2} />
        </button>
      </div>

      <div className={`divide-y divide-slate-700`}>
        {rates.map((rate, index) => (
          <div
            key={`${rate.from}-${rate.to}`}
            className={`
              px-5
              py-4
              transition-colors
              hover:bg-slate-700/30
              animate-fadeIn
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`flex items-center justify-between`}>
              <div className={`flex items-center gap-3`}>
                <div
                  className={`
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-slate-900/50
                  px-3
                  py-2
                  border
                  border-slate-700
                `}
                >
                  <span className={`text-sm font-bold text-slate-300`}>{rate.from}</span>
                  <ChevronRightIcon className={`h-4 w-4 text-slate-500`} />
                  <span className={`text-sm font-bold text-slate-300`}>{rate.to}</span>
                </div>
              </div>

              <div className={`flex items-center gap-3`}>
                <span className={`text-lg font-extrabold text-slate-100`}>{rate.rate.toFixed(4)}</span>

                {rate.trend && (
                  <div
                    className={`
                    flex
                    items-center
                    justify-center
                    w-6
                  `}
                  >
                    {rate.trend === `up` && <ArrowUpIcon className={`h-5 w-5 text-green-500`} />}
                    {rate.trend === `down` && <ArrowDownIcon className={`h-5 w-5 text-red-500`} />}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`
              mt-2
              flex
              items-center
              gap-1.5
            `}
            >
              <ClockIcon className={`h-3.5 w-3.5 text-slate-500`} />
              <span className={`text-xs font-medium text-slate-500`}>
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
