import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { PendingRequestsTable } from './PendingRequestsTable';
import { QuickDocsCard } from './QuickDocsCard';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { ClipboardListIcon } from '../../../shared/ui/icons/ClipboardListIcon';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { HomeIcon } from '../../../shared/ui/icons/HomeIcon';
import { InformationCircleIcon } from '../../../shared/ui/icons/InformationCircleIcon';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { type DashboardData } from '../schemas';

interface DashboardViewProps {
  data: DashboardData | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: `decimal`,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function DashboardView({ data }: DashboardViewProps) {
  if (!data) {
    return (
      <div
        className={`
        min-h-full
        bg-linear-to-br
        from-slate-50
        via-white
        to-slate-50
        dark:from-slate-950
        dark:via-slate-900
        dark:to-slate-950
      `}
      >
        <div
          className={`
          mx-auto
          max-w-6xl
          px-4
          pt-6
          sm:px-6
          sm:pt-8
          lg:px-8
        `}
        >
          <div
            className={`
            animate-fadeIn
            rounded-2xl
            border-2
            border-dashed
            border-slate-700
            bg-linear-to-br
            from-slate-800/50
            to-slate-900/50
            p-8
            shadow-inner
          `}
          >
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
              <InformationCircleIcon className={`h-8 w-8 text-slate-400`} />
            </div>
            <p
              className={`
              text-center
              text-base
              font-bold
              text-slate-200
            `}
            >
              Unable to load dashboard
            </p>
            <p
              className={`
              mt-2
              text-center
              text-sm
              text-slate-400
            `}
            >
              Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, pendingRequests, activity, tasks, quickDocs } = data;

  return (
    <div
      className={`
      min-h-full
      bg-linear-to-br
      from-slate-50
      via-white
      to-slate-50
      dark:from-slate-950
      dark:via-slate-900
      dark:to-slate-950
    `}
    >
      <PageHeader
        icon={<IconBadge icon={<HomeIcon className={`h-6 w-6 text-white`} />} hasRing />}
        title="Dashboard"
        subtitle="Welcome back! Here's your overview"
        badge={
          <div
            className={`
            hidden
            sm:flex
            items-center
            gap-2
            rounded-xl
            bg-slate-100
            px-4
            py-2
            dark:bg-slate-800
            border
            border-slate-200
            dark:border-slate-700
          `}
          >
            <CalendarIcon className={`h-4 w-4 text-slate-500`} />
            <span
              className={`
              text-sm
              font-semibold
              text-slate-700
              dark:text-slate-300
            `}
            >
              {new Date().toLocaleDateString(undefined, { weekday: `short`, month: `short`, day: `numeric` })}
            </span>
          </div>
        }
      />

      <div
        className={`
          mx-auto
          max-w-6xl
          px-4
          pt-6
          pb-6
          sm:px-6
          sm:pt-8
          lg:px-8
          space-y-6
          animate-fadeIn
        `}
        data-testid="consumer-mobile-dashboard-view"
      >
        <div className={`grid gap-4 sm:grid-cols-2`}>
          <div
            className={`
            group
            overflow-hidden
            rounded-2xl
            border
            border-slate-700
            bg-linear-to-br
            from-slate-800
            to-slate-900
            p-5
            shadow-lg
            transition-all
            duration-300
            hover:shadow-xl
            hover:scale-105
            animate-fadeIn
          `}
          >
            <div
              className={`
              flex
              items-start
              justify-between
              mb-3
            `}
            >
              <IconBadge
                icon={<CurrencyDollarIcon className={`h-6 w-6 text-white`} />}
                variant="success"
                rounded="xl"
                interactive
              />
              <span
                className={`
                rounded-lg
                bg-slate-900/50
                px-2.5
                py-1
                text-xs
                font-bold
                text-slate-300
                border
                border-slate-700
              `}
              >
                Balance
              </span>
            </div>
            <div className={`text-3xl font-extrabold text-slate-100`} data-testid="dashboard-balance">
              ${formatCents(summary.balanceCents)}
            </div>
            <div
              className={`
              mt-2
              text-xs
              font-semibold
              text-slate-400
            `}
            >
              Total available
            </div>
          </div>

          <div
            className={`
              group
              overflow-hidden
              rounded-2xl
              border
              border-slate-700
              bg-linear-to-br
              from-slate-800
              to-slate-900
              p-5
              shadow-lg
              transition-all
              duration-300
              hover:shadow-xl
              hover:scale-105
              animate-fadeIn
            `}
            style={{ animationDelay: `50ms` }}
          >
            <div
              className={`
              flex
              items-start
              justify-between
              mb-3
            `}
            >
              <IconBadge
                icon={<ClipboardListIcon className={`h-6 w-6 text-white`} />}
                variant="info"
                rounded="xl"
                interactive
              />
              <span
                className={`
                rounded-lg
                bg-slate-900/50
                px-2.5
                py-1
                text-xs
                font-bold
                text-slate-300
                border
                border-slate-700
              `}
              >
                Requests
              </span>
            </div>
            <div className={`text-3xl font-extrabold text-slate-100`} data-testid="dashboard-active-requests">
              {summary.activeRequests}
            </div>
            <div
              className={`
              mt-2
              text-xs
              font-semibold
              text-slate-400
            `}
            >
              Active payment requests
            </div>
          </div>
        </div>

        <div className={`grid gap-4 lg:grid-cols-2`}>
          {pendingRequests.length > 0 ? (
            <PendingRequestsTable requests={pendingRequests} maxItems={5} />
          ) : (
            <div
              className={`
                animate-fadeIn
                rounded-2xl
                border-2
                border-dashed
                border-slate-700
                bg-linear-to-br
                from-slate-800/50
                to-slate-900/50
                px-6
                py-16
                text-center
                shadow-inner
              `}
              style={{ animationDelay: `100ms` }}
            >
              <div
                className={`
                mx-auto
                mb-6
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-3xl
                bg-linear-to-br
                from-slate-100
                to-slate-200
                text-slate-400
                shadow-lg
                ring-8
                ring-slate-100/50
                dark:from-slate-700
                dark:to-slate-800
                dark:text-slate-500
                dark:ring-slate-800/50
              `}
              >
                <DocumentIcon className={`h-10 w-10`} strokeWidth={1.5} />
              </div>
              <h3 className={`text-xl font-bold text-slate-100`}>No pending requests</h3>
              <p
                className={`
                mt-3
                max-w-sm
                mx-auto
                text-base
                text-slate-400
              `}
              >
                You&apos;re all caught up! Create a new payment request to get started.
              </p>
              <a
                href="/payment-requests/new"
                className={`
                  mt-6
                  inline-flex
                  items-center
                  rounded-xl
                  bg-linear-to-r
                  from-primary-600
                  to-primary-700
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  shadow-primary-500/30
                  transition-all
                  hover:from-primary-700
                  hover:to-primary-800
                  hover:shadow-xl
                  active:scale-95
                `}
              >
                Create request
              </a>
            </div>
          )}

          {tasks && tasks.length > 0 && <ComplianceTasksCard tasks={tasks} />}
        </div>

        <div className={`grid gap-4 lg:grid-cols-2`}>
          {activity && activity.length > 0 && <ActivityTimeline activities={activity} maxItems={5} />}

          {quickDocs && quickDocs.length > 0 && <QuickDocsCard documents={quickDocs} maxItems={3} />}
        </div>
      </div>
    </div>
  );
}
