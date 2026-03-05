import Link from 'next/link';

interface PendingRequest {
  id: string;
  counterpartyName: string;
  amount: number;
  currencyCode: string;
  status: string;
  lastActivityAt: string | null;
}

interface PendingRequestsTableProps {
  requests: PendingRequest[];
  maxItems?: number;
}

/**
 * PendingRequestsTable - Mobile-optimized table for pending payment requests
 */
export function PendingRequestsTable({ requests, maxItems = 5 }: PendingRequestsTableProps) {
  const displayedRequests = requests.slice(0, maxItems);

  if (displayedRequests.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pending requests</h3>
          {requests.length > maxItems && (
            <Link
              href="/payments"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all ({requests.length})
            </Link>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {displayedRequests.map((req) => (
          <Link
            key={req.id}
            href={`/payments/${req.id}`}
            className="group block px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{req.counterpartyName}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {req.amount.toFixed(2)} {req.currencyCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {req.status}
                </span>
                <svg
                  className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
