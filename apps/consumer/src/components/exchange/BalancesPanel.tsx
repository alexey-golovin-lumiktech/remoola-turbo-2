'use client';

type BalanceMap = Record<string, number>;
type BalancesPanelProps = { balances: BalanceMap };

export function BalancesPanel({ balances }: BalancesPanelProps) {
  const entries = Object.entries(balances);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Loading balances...</p>;
  }

  return (
    <div className="flex gap-4 mb-6">
      {entries.map(([code, amount]) => (
        <div
          key={code}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 text-center shadow-sm"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400">{code} balance</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {amount.toFixed(2)} {code}
          </div>
        </div>
      ))}
    </div>
  );
}
