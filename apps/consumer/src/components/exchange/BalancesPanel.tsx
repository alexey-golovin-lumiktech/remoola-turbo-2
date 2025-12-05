'use client';

export function BalancesPanel({ balances }: { balances: Record<string, number> }) {
  const entries = Object.entries(balances);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 mb-6">Loading balances...</p>;
  }

  return (
    <div className="flex gap-4 mb-6">
      {entries.map(([currency, amount]) => (
        <div key={currency} className="flex-1 rounded-xl border bg-white p-4 text-center shadow-sm">
          <div className="text-xs text-gray-500">{currency} balance</div>
          <div className="text-lg font-semibold">
            {amount.toFixed(2)} {currency}
          </div>
        </div>
      ))}
    </div>
  );
}
