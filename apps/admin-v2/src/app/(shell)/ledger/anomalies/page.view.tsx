import { type LedgerAnomaliesPageData } from './page.loader';
import { AnomaliesClassesNav } from './sections/AnomaliesClassesNav';
import { AnomaliesFilters } from './sections/AnomaliesFilters';
import { AnomaliesHeaderPanel } from './sections/AnomaliesHeaderPanel';
import { AnomaliesListSection } from './sections/AnomaliesListSection';
import { AnomaliesSavedViews } from './sections/AnomaliesSavedViews';
import { AnomaliesSummaryGrid } from './sections/AnomaliesSummaryGrid';
import { WorkspaceLayout } from '../../../../components/workspace-layout';

export function LedgerAnomaliesPageView({ data }: { data: LedgerAnomaliesPageData }) {
  const { params, permissions, summary, list, savedViews } = data;
  const { className, dateFrom, dateTo, currentPayload, buildHref } = params;
  const { canManageSavedViews } = permissions;

  return (
    <WorkspaceLayout workspace="ledger-anomalies">
      <>
        <AnomaliesHeaderPanel className={className} list={list} summary={summary} />
        <AnomaliesSummaryGrid summary={summary} buildHref={buildHref} />
        <AnomaliesClassesNav className={className} buildHref={buildHref} />
        <AnomaliesSavedViews
          views={savedViews}
          currentPayload={currentPayload}
          buildHref={buildHref}
          canManageSavedViews={canManageSavedViews}
        />
        <AnomaliesFilters className={className} dateFrom={dateFrom} dateTo={dateTo} buildHref={buildHref} />
        <AnomaliesListSection className={className} list={list} summary={summary} buildHref={buildHref} />
      </>
    </WorkspaceLayout>
  );
}
