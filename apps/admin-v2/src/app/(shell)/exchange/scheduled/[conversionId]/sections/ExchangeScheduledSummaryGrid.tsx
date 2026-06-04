import { formatDateTime } from '../../../../../../lib/admin-format';
import { type ExchangeScheduledCasePageData } from '../page.loader';

export function ExchangeScheduledSummaryGrid({
  conversion,
}: {
  conversion: ExchangeScheduledCasePageData[`conversion`];
}) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Core</h3>
        <p className="muted">
          Amount: {conversion.core.amount} {conversion.core.sourceCurrency}
        </p>
        <p className="muted">Execute at: {formatDateTime(conversion.core.executeAt)}</p>
        <p className="muted">Updated: {formatDateTime(conversion.updatedAt)}</p>
        <p className="muted">Version: {conversion.version}</p>
      </article>
      <article className="panel">
        <h3>Timing</h3>
        <p className="muted">Processing: {formatDateTime(conversion.core.processingAt)}</p>
        <p className="muted">Executed: {formatDateTime(conversion.core.executedAt)}</p>
        <p className="muted">Failed: {formatDateTime(conversion.core.failedAt)}</p>
      </article>
      <article className="panel">
        <h3>Failure detail</h3>
        <p className="muted">{conversion.failureDetail ?? `No failure detail.`}</p>
      </article>
    </section>
  );
}
