'use client';

export function StatusPill({ value }: { value: string }) {
  const isGood = value === `COMPLETED`;
  const isBad = value === `DENIED` || value === `UNCOLLECTIBLE`;
  const cls = isGood
    ? `bg-green-50 text-green-700 border-green-200`
    : isBad
      ? `bg-red-50 text-red-700 border-red-200`
      : `bg-gray-50 text-gray-700 border-gray-200`;

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${cls}`}>{value}</span>;
}
