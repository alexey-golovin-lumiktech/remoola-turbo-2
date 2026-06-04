import { formatDateTime, EMPTY_VALUE } from '../../../../../../lib/admin-format';
import { type ExchangeRateCasePageData } from '../page.loader';

export function ExchangeRateLifecycleSection({ rate }: { rate: ExchangeRateCasePageData[`rate`] }) {
  return (
    <article className="panel">
      <h2>Lifecycle</h2>
      <div className="formStack">
        <p className="muted">Effective: {formatDateTime(rate.core.effectiveAt)}</p>
        <p className="muted">Expires: {formatDateTime(rate.core.expiresAt)}</p>
        <p className="muted">Approved at: {formatDateTime(rate.core.approvedAt)}</p>
        <p className="muted">Approved by: {rate.core.approvedBy ?? EMPTY_VALUE}</p>
        <p className="muted">Created: {formatDateTime(rate.core.createdAt)}</p>
        <p className="muted">Version: {rate.version}</p>
      </div>
    </article>
  );
}
