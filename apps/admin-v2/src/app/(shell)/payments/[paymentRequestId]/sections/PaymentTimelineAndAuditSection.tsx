import { Panel } from '../../../../../components/panel';
import { mutedTextClass, nestedPanelClass, stackClass } from '../../../../../components/ui-classes';
import { type PaymentPageData } from '../page.loader';
import { formatDate, renderMetadata } from '../payment-shared';

export function PaymentTimelineAndAuditSection({ paymentCase }: { paymentCase: PaymentPageData[`paymentCase`] }) {
  return (
    <section className="detailGrid">
      <Panel title="Timeline">
        <div className={stackClass}>
          {paymentCase.timeline.map((item, index) => (
            <div className={nestedPanelClass} key={`${item.event}-${index}`}>
              <strong>{item.event}</strong>
              <p className={mutedTextClass}>{formatDate(item.timestamp)}</p>
              <p className={mutedTextClass}>
                {item.metadata && Object.keys(item.metadata).length > 0
                  ? `${Object.keys(item.metadata).length} metadata field${Object.keys(item.metadata).length === 1 ? `` : `s`}`
                  : `No metadata`}
              </p>
              {renderMetadata(item.metadata)}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Audit context">
        <div className={stackClass}>
          {paymentCase.auditContext.length === 0 ? <p className={mutedTextClass}>No related admin actions.</p> : null}
          {paymentCase.auditContext.map((item) => (
            <div className={nestedPanelClass} key={item.id}>
              <strong>{item.action}</strong>
              <p className={mutedTextClass}>{item.adminEmail ?? `Unknown admin`}</p>
              <p className={mutedTextClass}>{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
