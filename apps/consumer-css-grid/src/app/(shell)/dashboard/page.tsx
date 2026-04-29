import { buildDashboardBalanceBreakdown } from './dashboard-view-model';
import {
  DashboardActionCardsSection,
  DashboardCurrencyBreakdownSection,
  DashboardMainPanelsSection,
  DashboardMetricsSection,
  DashboardUnavailableBanner,
  DashboardVerificationSection,
} from './DashboardSections';
import { getVerificationBannerState } from './verification-banner';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getAvailableBalances, getBalances, getDashboardData } from '../../../lib/consumer-api.server';
import { HomeIcon } from '../../../shared/ui/icons/HomeIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

export default async function DashboardPage() {
  const [dashboardResult, settledBalances, availableBalances] = await Promise.all([
    getDashboardData({ redirectTo: `/dashboard` }),
    getBalances({ redirectTo: `/dashboard` }),
    getAvailableBalances({ redirectTo: `/dashboard` }),
  ]);
  const dashboard = dashboardResult.data;
  const dashboardUnavailable = dashboardResult.unavailable;
  const summary = dashboard?.summary;
  const settledCurrencyCode = summary?.balanceCurrencyCode ?? `USD`;
  const availableCurrencyCode = summary?.availableBalanceCurrencyCode ?? settledCurrencyCode;
  const pendingRequests = dashboard?.pendingRequests ?? [];
  const pendingWithdrawals = dashboard?.pendingWithdrawals?.items ?? [];
  const quickDocs = dashboard?.quickDocs ?? [];
  const activity = dashboard?.activity ?? [];
  const tasks = dashboard?.tasks ?? [];
  const verification = dashboard?.verification;
  const verificationBanner = getVerificationBannerState(verification, dashboardUnavailable);
  const balanceBreakdown = buildDashboardBalanceBreakdown({
    availableBalances,
    settledBalances,
    settledCurrencyCode,
  });
  const showCurrencyBreakdown = !dashboardUnavailable && balanceBreakdown.length > 1;
  const dashboardHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DASHBOARD,
    preferredSlugs: [
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    ],
  });
  const dashboardPaymentsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS,
    preferredSlugs: [HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW, HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST],
    limit: 2,
  });
  const dashboardQuickDocsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST,
    preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH, HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST],
    limit: 2,
  });
  const dashboardActivityHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DASHBOARD,
    preferredSlugs: [HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW],
    limit: 1,
  });

  return (
    <div>
      <PageHeader title="Dashboard" icon={<HomeIcon className="h-10 w-10" />} />

      {dashboardUnavailable ? <DashboardUnavailableBanner /> : null}

      <HelpContextualGuides
        guides={dashboardHelpGuides}
        title="Use the dashboard as a launch point"
        description="These guides explain the dashboard summary, verification state, and the next route to open when a balance, task, or banner needs attention."
        className="mb-5"
      />

      <DashboardMetricsSection
        availableCurrencyCode={availableCurrencyCode}
        dashboardUnavailable={dashboardUnavailable}
        settledCurrencyCode={settledCurrencyCode}
        summary={summary}
      />

      {showCurrencyBreakdown ? (
        <DashboardCurrencyBreakdownSection
          balanceBreakdown={balanceBreakdown}
          settledCurrencyCode={settledCurrencyCode}
        />
      ) : null}

      <DashboardVerificationSection
        dashboardUnavailable={dashboardUnavailable}
        verification={verification}
        verificationBanner={verificationBanner}
      />

      <DashboardActionCardsSection />

      <DashboardMainPanelsSection
        activity={activity}
        activityHelpGuides={dashboardActivityHelpGuides}
        paymentsHelpGuides={dashboardPaymentsHelpGuides}
        pendingRequests={pendingRequests}
        pendingWithdrawals={pendingWithdrawals}
        pendingWithdrawalsTotal={dashboard?.pendingWithdrawals?.total ?? pendingWithdrawals.length}
        quickDocs={quickDocs}
        quickDocsHelpGuides={dashboardQuickDocsHelpGuides}
        tasks={tasks}
      />
    </div>
  );
}
