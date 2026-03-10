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
        className={`
        overflow-hidden
        rounded-2xl
        border-2
        border-dashed
        border-slate-700
        bg-linear-to-br
        from-slate-800/50
        to-slate-900/50
        shadow-inner
      `}
      >
        <div className={`p-8 text-center`}>
          <div
            className={`
            mx-auto
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-slate-700
            shadow-lg
          `}
          >
            <svg
              className={`h-8 w-8 text-slate-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className={`text-base font-bold text-slate-200`}>No balances</p>
          <p className={`mt-2 text-sm text-slate-400`}>Make a payment to see your currency balances</p>
        </div>
      </div>
    );
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
        border-b
        border-slate-700
        bg-linear-to-r
        from-slate-800
        to-slate-900
        px-5
        py-4
      `}
      >
        <div className={`flex items-center gap-2`}>
          <svg
            className={`h-5 w-5 text-primary-400`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className={`text-base font-bold text-slate-100`}>Your balances</h3>
        </div>
      </div>

      <div className={`divide-y divide-slate-700`}>
        {balances.map((balance, index) => (
          <button
            key={balance.currency}
            onClick={() => onSelectCurrency?.(balance.currency)}
            className={`
              group
              min-h-15
              w-full
              px-5
              py-4
              text-left
              transition-all
              duration-200
              animate-fadeIn
              ${onSelectCurrency ? `hover:bg-slate-700/50 active:scale-[0.99]` : `cursor-default`}
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`flex items-center justify-between`}>
              <div className={`flex items-center gap-3.5`}>
                <div
                  className={`
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-linear-to-br
                  from-primary-500
                  to-primary-600
                  shadow-md
                  transition-transform
                  duration-200
                  group-hover:scale-110
                `}
                >
                  <span className={`text-base font-extrabold text-white`}>{balance.symbol}</span>
                </div>
                <div>
                  <p className={`text-base font-bold text-slate-100`}>{balance.currency}</p>
                  <p className={`text-xs font-medium text-slate-400`}>Available balance</p>
                </div>
              </div>
              <p className={`text-xl font-extrabold text-slate-100`}>
                {balance.symbol}
                {formatAmount(balance.amountCents)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div
        className={`
        border-t
        border-slate-700
        bg-slate-900/50
        px-5
        py-3
      `}
      >
        <div className={`flex items-center justify-between`}>
          <span className={`text-xs font-semibold text-slate-400`}>
            Total: {balances.length} {balances.length === 1 ? `currency` : `currencies`}
          </span>
          <div className={`flex items-center gap-1.5`}>
            <div
              className={`
              h-2
              w-2
              rounded-full
              bg-green-500
              animate-pulse
            `}
            />
            <span className={`text-xs font-medium text-slate-500`}>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
