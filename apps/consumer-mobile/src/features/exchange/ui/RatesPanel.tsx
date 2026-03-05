'use client';

import { useState } from 'react';

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
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
        dark:border-slate-700
        dark:bg-slate-800
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-200
          bg-slate-50
          px-4
          py-3
          dark:border-slate-700
          dark:bg-slate-800/50
        "
      >
        <h3
          className="
            text-sm
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          Exchange rates
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="
            flex
            min-h-[44px]
            min-w-[44px]
            items-center
            justify-center
            rounded-lg
            text-sm
            text-primary-600
            transition-colors
            hover:bg-slate-100
            focus:outline-none
            focus:ring-2
            focus:ring-primary-500
            disabled:opacity-50
            dark:text-primary-400
            dark:hover:bg-slate-700
          "
          aria-label="Refresh rates"
        >
          <svg
            className={`
              h-5
              w-5
              ${isRefreshing ? `animate-spin` : ``}
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div
        className="
          divide-y
          divide-slate-200
          dark:divide-slate-700
        "
      >
        {rates.map((rate) => (
          <div
            key={`${rate.from}-${rate.to}`}
            className="
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    flex
                    items-baseline
                    gap-1
                  "
                >
                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-600
                      dark:text-slate-400
                    "
                  >
                    {rate.from}
                  </span>
                  <svg
                    className="
                      h-4
                      w-4
                      text-slate-400
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-600
                      dark:text-slate-400
                    "
                  >
                    {rate.to}
                  </span>
                </div>
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    text-base
                    font-bold
                    text-slate-900
                    dark:text-white
                  "
                >
                  {rate.rate.toFixed(4)}
                </span>

                {rate.trend && (
                  <div
                    className="
                      flex
                      items-center
                    "
                  >
                    {rate.trend === `up` && (
                      <svg
                        className="
                          h-4
                          w-4
                          text-green-600
                        "
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {rate.trend === `down` && (
                      <svg
                        className="
                          h-4
                          w-4
                          text-red-600
                        "
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className="
                mt-1
                flex
                items-center
                gap-1
              "
            >
              <svg
                className="
                  h-3
                  w-3
                  text-slate-400
                "
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span
                className="
                  text-xs
                  text-slate-500
                  dark:text-slate-500
                "
              >
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
