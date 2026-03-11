import Link from 'next/link';

import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';

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
        border-slate-200
        bg-linear-to-br
        from-white
        to-slate-50
        shadow-xl
        animate-fadeIn
        dark:border-slate-700
        dark:from-slate-800
        dark:to-slate-900
      `}
      style={{ animationDelay: `100ms` }}
    >
      <div
        className={`
        border-b
        border-slate-200
        bg-linear-to-r
        from-slate-50
        to-slate-100
        px-6
        py-4
        dark:border-slate-700/80
        dark:from-slate-800
        dark:via-slate-800
        dark:to-slate-900
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
              border
              border-amber-500/20
              bg-amber-500/10
            `}
            >
              <ClockIcon className={`h-5 w-5 text-amber-600 dark:text-amber-400`} strokeWidth={2.5} />
            </div>
            <h3 className={`text-lg font-bold text-slate-900 dark:text-slate-100`}>Pending requests</h3>
          </div>
          {requests.length > maxItems && (
            <Link
              href="/payments"
              className={`
                text-sm
                font-bold
                text-primary-600
                transition-all
                hover:underline
                decoration-2
                underline-offset-4
                hover:text-primary-500
                dark:text-primary-400
                dark:hover:text-primary-300
              `}
            >
              View all ({requests.length})
            </Link>
          )}
        </div>
      </div>

      <div className={`divide-y divide-slate-200 dark:divide-slate-700/50`}>
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
              hover:bg-slate-100
              active:scale-[0.98]
              animate-fadeIn
              dark:hover:bg-slate-700/40
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
                  text-slate-900
                  transition-colors
                  group-hover:text-slate-800
                  dark:text-slate-100
                  dark:group-hover:text-white
                `}
                >
                  {req.counterpartyName}
                </p>
                <p
                  className={`
                  mt-1
                  text-sm
                  font-semibold
                  text-slate-500
                  transition-colors
                  group-hover:text-slate-600
                  dark:text-slate-400
                  dark:group-hover:text-slate-300
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
                  border
                  border-amber-600/50
                  bg-amber-100
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  text-amber-800
                  shadow-xs
                  dark:border-amber-700/50
                  dark:bg-amber-900/50
                  dark:text-amber-300
                `}
                >
                  {req.status}
                </span>
                <ChevronRightIcon
                  className={`
                    h-5
                    w-5
                    shrink-0
                    text-slate-500
                    transition-all
                    duration-200
                    group-hover:translate-x-1
                    group-hover:text-slate-700
                    dark:group-hover:text-slate-300
                  `}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
