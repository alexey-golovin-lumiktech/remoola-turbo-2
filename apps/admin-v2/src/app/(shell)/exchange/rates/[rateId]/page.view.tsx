import { type ExchangeRateCasePageData } from './page.loader';
import { type ExchangeRateCasePagePermissions } from './page.permissions';
import { ExchangeRateActionsSection } from './sections/ExchangeRateActionsSection';
import { ExchangeRateAuditSection } from './sections/ExchangeRateAuditSection';
import { ExchangeRateHeaderPanel } from './sections/ExchangeRateHeaderPanel';
import { ExchangeRateLifecycleSection } from './sections/ExchangeRateLifecycleSection';
import { ExchangeRateSummaryGrid } from './sections/ExchangeRateSummaryGrid';

export function ExchangeRateCasePageView({
  data,
  permissions,
}: {
  data: ExchangeRateCasePageData;
  permissions: ExchangeRateCasePagePermissions;
}) {
  const { rate } = data;
  const { canManage } = permissions;

  return (
    <>
      <ExchangeRateHeaderPanel rate={rate} />
      <ExchangeRateSummaryGrid rate={rate} />
      <section className="detailGrid">
        <ExchangeRateLifecycleSection rate={rate} />
        <ExchangeRateAuditSection rate={rate} />
      </section>
      <ExchangeRateActionsSection rate={rate} canManage={canManage} />
    </>
  );
}
