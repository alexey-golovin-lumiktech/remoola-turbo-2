import { formatDateTime } from '../../../../../../lib/admin-format';
import { type ExchangeRateCasePageData } from '../page.loader';

const formatDate = formatDateTime;

export function ExchangeRateLifecycleSection({ rate }: { rate: ExchangeRateCasePageData[`rate`] }) {
  return (
    <article className="panel">
      <h2>Lifecycle</h2>
      <div className="formStack">
        <p className="muted">Effective: {formatDate(rate.core.effectiveAt)}</p>
        <p className="muted">Expires: {formatDate(rate.core.expiresAt)}</p>
        <p className="muted">Approved at: {formatDate(rate.core.approvedAt)}</p>
        <p className="muted">Approved by: {rate.core.approvedBy ?? `-`}</p>
        <p className="muted">Created: {formatDate(rate.core.createdAt)}</p>
        <p className="muted">Version: {rate.version}</p>
      </div>
    </article>
  );
}
