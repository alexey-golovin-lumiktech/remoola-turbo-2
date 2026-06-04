import { nestedPanelClass } from '../../../../../components/ui-classes';
import { formatDate } from '../../../../../lib/admin-format';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntryAuditSection({ ledgerCase }: { ledgerCase: LedgerEntryCasePageData[`ledgerCase`] }) {
  return (
    <section className="panel">
      <h2>Audit context</h2>
      <div className="formStack">
        {ledgerCase.auditContext.length === 0 ? <p className="muted">No related admin actions.</p> : null}
        {ledgerCase.auditContext.map((item) => (
          <div className={nestedPanelClass} key={item.id}>
            <strong>{item.action}</strong>
            <p className="muted">{item.adminEmail ?? `Unknown admin`}</p>
            <p className="muted">{formatDate(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
