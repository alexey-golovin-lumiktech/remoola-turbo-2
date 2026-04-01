import Link from 'next/link';

import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { DashboardRetryButton } from './DashboardRetryButton';
import { PendingRequestsTable } from './PendingRequestsTable';
import { QuickDocsCard } from './QuickDocsCard';
import { BalanceCard } from '../../../shared/ui/BalanceCard';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { ClipboardListIcon } from '../../../shared/ui/icons/ClipboardListIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { HomeIcon } from '../../../shared/ui/icons/HomeIcon';
import { InformationCircleIcon } from '../../../shared/ui/icons/InformationCircleIcon';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { VerificationCard } from '../../verification/ui/VerificationCard';
import { type DashboardData } from '../schemas';
import styles from './DashboardView.module.css';

interface DashboardViewProps {
  data: DashboardData | null;
}

export function DashboardView({ data }: DashboardViewProps) {
  if (!data) {
    return (
      <div className={styles.pageBg}>
        <div className={styles.errorMain}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <InformationCircleIcon className={styles.errorIconSvg} />
            </div>
            <p className={styles.errorTitle}>Unable to load dashboard</p>
            <p className={styles.errorMessage}>Please try again later.</p>
            <DashboardRetryButton />
          </div>
        </div>
      </div>
    );
  }

  const { summary, pendingRequests, activity, tasks, quickDocs } = data;

  return (
    <div className={styles.pageBg}>
      <PageHeader
        icon={<IconBadge icon={<HomeIcon className={styles.iconWhite} />} hasRing />}
        title="Dashboard"
        subtitle="Welcome back! Here's your overview"
        badge={
          <div className={styles.badge}>
            <CalendarIcon className={styles.badgeIcon} />
            <span className={styles.badgeText}>
              {new Date().toLocaleDateString(undefined, { weekday: `short`, month: `short`, day: `numeric` })}
            </span>
          </div>
        }
      />

      <div className={styles.main} data-testid="consumer-mobile-dashboard-view">
        <div className={styles.grid2}>
          <BalanceCard
            amountCents={summary.balanceCents}
            currencyCode="USD"
            label="Balance"
            testId="dashboard-balance"
          />

          <div className={styles.requestsCard} style={{ animationDelay: `50ms` }}>
            <div className={styles.requestsCardHeader}>
              <IconBadge
                icon={<ClipboardListIcon className={styles.clipboardIcon} />}
                variant="primary"
                rounded="xl"
                interactive
              />
              <span className={styles.requestsCardBadge}>Requests</span>
            </div>
            <div className={styles.requestsCardValue} data-testid="dashboard-active-requests">
              {summary.activeRequests}
            </div>
            <div className={styles.requestsCardLabel}>Active payment requests</div>
          </div>
        </div>

        <VerificationCard verification={data.verification} context="dashboard" />

        <div className={styles.grid2Lg}>
          {pendingRequests.length > 0 ? (
            <PendingRequestsTable requests={pendingRequests} maxItems={5} />
          ) : (
            <div className={styles.emptyPending} style={{ animationDelay: `100ms` }}>
              <div className={styles.emptyPendingIcon}>
                <DocumentIcon className={styles.emptyPendingIconSvg} strokeWidth={1.5} />
              </div>
              <h3 className={styles.emptyPendingTitle}>No pending requests</h3>
              <p className={styles.emptyPendingMessage}>
                You&apos;re all caught up! Create a new payment request to get started.
              </p>
              <Link href="/payment-requests/new" className={styles.createRequestLink}>
                Create request
              </Link>
            </div>
          )}

          {tasks?.length > 0 ? <ComplianceTasksCard tasks={tasks} /> : null}
        </div>

        <div className={styles.grid2Lg}>
          {activity?.length > 0 ? <ActivityTimeline activities={activity} maxItems={5} /> : null}

          {quickDocs?.length > 0 ? <QuickDocsCard documents={quickDocs} maxItems={3} /> : null}
        </div>
      </div>
    </div>
  );
}
