import { formatDateTime } from '../../../../../../lib/admin-format';
import { type ExchangeRuleCasePageData } from '../page.loader';

const formatDate = formatDateTime;

export function ExchangeRuleSummaryGrid({ rule }: { rule: ExchangeRuleCasePageData[`rule`] }) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Thresholds</h3>
        <p className="muted">Target balance: {rule.core.threshold}</p>
        <p className="muted">Max convert amount: {rule.core.maxConvertAmount ?? `-`}</p>
        <p className="muted">Interval: {rule.core.minIntervalMinutes} minutes</p>
      </article>
      <article className="panel">
        <h3>Timing</h3>
        <p className="muted">Last run: {formatDate(rule.core.lastRunAt)}</p>
        <p className="muted">Next run: {formatDate(rule.core.nextRunAt)}</p>
        <p className="muted">Updated: {formatDate(rule.updatedAt)}</p>
      </article>
      <article className="panel">
        <h3>Consumer</h3>
        <p className="muted">{rule.consumer.email ?? rule.consumer.id}</p>
        <p className="muted mono">{rule.consumer.id}</p>
        <p className="muted">Created: {formatDate(rule.core.createdAt)}</p>
      </article>
    </section>
  );
}
