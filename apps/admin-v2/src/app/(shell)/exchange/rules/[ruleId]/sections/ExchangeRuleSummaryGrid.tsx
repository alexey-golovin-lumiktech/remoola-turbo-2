import { EMPTY_VALUE, formatDateTime } from '../../../../../../lib/admin-format';
import { type ExchangeRuleCasePageData } from '../page.loader';

export function ExchangeRuleSummaryGrid({ rule }: { rule: ExchangeRuleCasePageData[`rule`] }) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Thresholds</h3>
        <p className="muted">Target balance: {rule.core.threshold}</p>
        <p className="muted">Max convert amount: {rule.core.maxConvertAmount ?? EMPTY_VALUE}</p>
        <p className="muted">Interval: {rule.core.minIntervalMinutes} minutes</p>
      </article>
      <article className="panel">
        <h3>Timing</h3>
        <p className="muted">Last run: {formatDateTime(rule.core.lastRunAt)}</p>
        <p className="muted">Next run: {formatDateTime(rule.core.nextRunAt)}</p>
        <p className="muted">Updated: {formatDateTime(rule.updatedAt)}</p>
      </article>
      <article className="panel">
        <h3>Consumer</h3>
        <p className="muted">{rule.consumer.email ?? rule.consumer.id}</p>
        <p className="muted mono">{rule.consumer.id}</p>
        <p className="muted">Created: {formatDateTime(rule.core.createdAt)}</p>
      </article>
    </section>
  );
}
