import Link from 'next/link';

import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

export function DashboardUnavailableBanner() {
  return (
    <section className="mb-5 rounded-[28px] border border-transparent bg-(--app-warning-soft) p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-(--app-warning-text)">Dashboard sync</div>
          <h2 className="mt-1 text-2xl font-semibold text-(--app-text)">Dashboard data is temporarily unavailable</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-(--app-text-soft)">
            Navigation and payment flows are still available, but this page could not load live dashboard data from the
            backend right now.
          </p>
          <Link
            href={`/help/${HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW}`}
            className="mt-3 inline-flex text-sm text-(--app-primary) hover:opacity-80"
          >
            Learn how to read the dashboard and where to continue
          </Link>
        </div>
        <Link
          href="/payments"
          className="inline-flex rounded-full bg-(--app-primary) px-4 py-2 text-sm font-medium text-(--app-primary-contrast)"
        >
          Go to payments
        </Link>
      </div>
    </section>
  );
}
