import { Panel } from '../../../../../components/panel';
import { mutedTextClass, nestedPanelClass, stackClass } from '../../../../../components/ui-classes';
import { formatDateTime } from '../../../../../lib/admin-format';
import { type PayoutCasePageData } from '../page.loader';

export function PayoutAuditSection({ payoutCase }: { payoutCase: PayoutCasePageData[`payoutCase`] }) {
  return (
    <Panel title="Audit context">
      <div className={stackClass}>
        {payoutCase.auditContext.length === 0 ? <p className={mutedTextClass}>No related admin actions.</p> : null}
        {payoutCase.auditContext.map((item) => (
          <div className={nestedPanelClass} key={item.id}>
            <strong>{item.action}</strong>
            <p className={mutedTextClass}>{item.adminEmail ?? `Unknown admin`}</p>
            <p className={mutedTextClass}>{formatDateTime(item?.createdAt)}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
