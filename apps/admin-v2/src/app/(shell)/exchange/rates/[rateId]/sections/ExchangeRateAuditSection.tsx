import { formatDate } from '../../../../../../lib/admin-format';
import { type ExchangeRateCasePageData } from '../page.loader';

export function ExchangeRateAuditSection({ rate }: { rate: ExchangeRateCasePageData[`rate`] }) {
  return (
    <article className="panel">
      <h2>Approval history</h2>
      <div className="formStack">
        {rate.approvalHistory.length === 0 ? <p className="muted">No approval audit entries yet.</p> : null}
        {rate.approvalHistory.map((item) => (
          <div className="panel" key={item.id}>
            <strong>{item.action}</strong>
            <p className="muted">{item.admin.email ?? item.admin.id}</p>
            <p className="muted">{formatDate(item.createdAt)}</p>
            <pre className="mono">{JSON.stringify(item.metadata, null, 2)}</pre>
          </div>
        ))}
      </div>
    </article>
  );
}
