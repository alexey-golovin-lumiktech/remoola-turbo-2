import { type ExchangeRuleCasePageData } from './page.loader';
import { type ExchangeRuleCasePagePermissions } from './page.permissions';
import { ExchangeRuleActionsSection } from './sections/ExchangeRuleActionsSection';
import { ExchangeRuleExecutionSection } from './sections/ExchangeRuleExecutionSection';
import { ExchangeRuleHeaderPanel } from './sections/ExchangeRuleHeaderPanel';
import { ExchangeRuleSummaryGrid } from './sections/ExchangeRuleSummaryGrid';

export function ExchangeRuleCasePageView({
  data,
  permissions,
}: {
  data: ExchangeRuleCasePageData;
  permissions: ExchangeRuleCasePagePermissions;
}) {
  const { rule } = data;
  const { canManage } = permissions;

  return (
    <>
      <ExchangeRuleHeaderPanel rule={rule} />
      <ExchangeRuleSummaryGrid rule={rule} />
      <section className="detailGrid">
        <ExchangeRuleExecutionSection rule={rule} />
        <ExchangeRuleActionsSection rule={rule} canManage={canManage} />
      </section>
    </>
  );
}
