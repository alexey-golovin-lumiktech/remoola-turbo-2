import { formatDateTime } from '../../../../../../lib/admin-format';
import { type ExchangeScheduledCasePageData } from '../page.loader';

const formatDate = formatDateTime;

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
        <p className="muted">Execute at: {formatDate(conversion.core.executeAt)}</p>
        <p className="muted">Updated: {formatDate(conversion.updatedAt)}</p>
        <p className="muted">Version: {conversion.version}</p>
      </article>
      <article className="panel">
        <h3>Timing</h3>
        <p className="muted">Processing: {formatDate(conversion.core.processingAt)}</p>
        <p className="muted">Executed: {formatDate(conversion.core.executedAt)}</p>
        <p className="muted">Failed: {formatDate(conversion.core.failedAt)}</p>
      </article>
      <article className="panel">
        <h3>Failure detail</h3>
        <p className="muted">{conversion.failureDetail ?? `No failure detail.`}</p>
      </article>
    </section>
  );
}
