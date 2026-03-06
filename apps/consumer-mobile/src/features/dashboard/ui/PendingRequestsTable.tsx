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
    <div
      className={`
        overflow-hidden
        rounded-2xl
        border
        border-slate-700
        bg-gradient-to-br
        from-slate-800
        to-slate-900
        shadow-xl
        animate-fadeIn
      `}
      style={{ animationDelay: `100ms` }}
    >
      <div
        className={`
        border-b
        border-slate-700/80
        bg-gradient-to-r
        from-slate-800
        via-slate-850
        to-slate-900
        px-6
        py-4
      `}
      >
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center gap-2.5`}>
            <div
              className={`
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-amber-500/10
              border
              border-amber-500/20
            `}
            >
              <svg
                className={`h-5 w-5 text-amber-400`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`text-lg font-bold text-slate-100`}>Pending requests</h3>
          </div>
          {requests.length > maxItems && (
            <Link
              href="/payments"
              className={`
                text-sm
                font-bold
                text-primary-400
                hover:text-primary-300
                transition-all
                hover:underline
                decoration-2
                underline-offset-4
              `}
            >
              View all ({requests.length})
            </Link>
          )}
        </div>
      </div>

      <div className={`divide-y divide-slate-700/50`}>
        {displayedRequests.map((req, index) => (
          <Link
            key={req.id}
            href={`/payments/${req.id}`}
            className={`
              group
              block
              px-6
              py-4
              transition-all
              duration-200
              hover:bg-slate-700/40
              active:scale-[0.98]
              animate-fadeIn
            `}
            style={{ animationDelay: `${100 + index * 50}ms` }}
          >
            <div
              className={`
              flex
              items-center
              justify-between
              gap-4
            `}
            >
              <div className={`flex-1 min-w-0`}>
                <p
                  className={`
                  truncate
                  text-base
                  font-bold
                  text-slate-100
                  group-hover:text-white
                  transition-colors
                `}
                >
                  {req.counterpartyName}
                </p>
                <p
                  className={`
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-400
                  group-hover:text-slate-300
                  transition-colors
                `}
                >
                  {req.amount.toFixed(2)} {req.currencyCode}
                </p>
              </div>
              <div className={`flex items-center gap-3`}>
                <span
                  className={`
                  inline-flex
                  items-center
                  rounded-full
                  bg-amber-900/50
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  text-amber-300
                  border
                  border-amber-700/50
                  shadow-sm
                `}
                >
                  {req.status}
                </span>
                <svg
                  className={`
                    h-5
                    w-5
                    shrink-0
                    text-slate-500
                    transition-all
                    duration-200
                    group-hover:translate-x-1
                    group-hover:text-slate-300
                  `}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
