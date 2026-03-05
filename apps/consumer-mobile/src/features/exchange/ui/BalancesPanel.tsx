interface Balance {
  currency: string;
  amountCents: number;
  symbol: string;
}

interface BalancesPanelProps {
  balances: Balance[];
  onSelectCurrency?: (currency: string) => void;
}

export function BalancesPanel({ balances, onSelectCurrency }: BalancesPanelProps) {
  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (balances.length === 0) {
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
            p-6
            text-center
          "
        >
          <div
            className="
              mx-auto
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-slate-100
              dark:bg-slate-700
            "
          >
            <svg
              className="
                h-6
                w-6
                text-slate-500
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p
            className="
              mt-3
              text-sm
              font-medium
              text-slate-900
              dark:text-white
            "
          >
            No balances
          </p>
          <p
            className="
              mt-1
              text-xs
              text-slate-600
              dark:text-slate-400
            "
          >
            Make a payment to see your currency balances
          </p>
        </div>
      </div>
    );
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
          Your balances
        </h3>
      </div>

      <div
        className="
          divide-y
          divide-slate-200
          dark:divide-slate-700
        "
      >
        {balances.map((balance) => (
          <button
            key={balance.currency}
            onClick={() => onSelectCurrency?.(balance.currency)}
            className={`
              min-h-[44px]
              w-full
              px-4
              py-3
              text-left
              transition-colors
              ${onSelectCurrency ? `hover:bg-slate-50 dark:hover:bg-slate-700/50` : `cursor-default`}
            `}
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
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    bg-primary-100
                    text-primary-600
                    dark:bg-primary-900/30
                    dark:text-primary-400
                  "
                >
                  <span
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    {balance.symbol}
                  </span>
                </div>
                <div>
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    {balance.currency}
                  </p>
                  <p
                    className="
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Available
                  </p>
                </div>
              </div>
              <p
                className="
                  text-lg
                  font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                {balance.symbol}
                {formatAmount(balance.amountCents)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div
        className="
          border-t
          border-slate-200
          bg-slate-50
          px-4
          py-3
          dark:border-slate-700
          dark:bg-slate-800/50
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
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
            Total ({balances.length} {balances.length === 1 ? `currency` : `currencies`})
          </span>
          <span
            className="
              text-xs
              text-slate-500
              dark:text-slate-500
            "
          >
            Updated just now
          </span>
        </div>
      </div>
    </div>
  );
}
