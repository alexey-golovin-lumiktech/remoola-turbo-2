import { Panel } from '../../../../../components/panel';
import { mutedTextClass, nestedPanelClass, rawDataClass, stackClass } from '../../../../../components/ui-classes';
import { formatDate, EMPTY_VALUE } from '../../../../../lib/admin-format';
import { type VerificationCasePageData } from '../page.loader';

export function VerificationAuditSection({
  verificationCase,
}: {
  verificationCase: VerificationCasePageData[`verificationCase`];
}) {
  return (
    <section className="detailGrid">
      <Panel title="Decision history">
        {verificationCase.decisionHistory.length === 0 ? (
          <p className={mutedTextClass}>No verification decisions yet.</p>
        ) : null}
        <div className={stackClass}>
          {verificationCase.decisionHistory.map((item, index) => (
            <div className={nestedPanelClass} key={String(item.id ?? index)}>
              <strong>{String(item.action ?? EMPTY_VALUE)}</strong>
              <p className={mutedTextClass}>
                Admin: {String((item as { admin?: { email?: string } }).admin?.email ?? item.adminId ?? EMPTY_VALUE)}
              </p>
              <p className={mutedTextClass}>Created: {formatDate(item.createdAt)}</p>
              <pre className={rawDataClass}>{JSON.stringify(item.metadata ?? {}, null, 2)}</pre>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Recent auth events">
        {verificationCase.authRisk.recentEvents.length === 0 ? (
          <p className={mutedTextClass}>No recent auth events.</p>
        ) : null}
        <div className={stackClass}>
          {verificationCase.authRisk.recentEvents.map((item, index) => (
            <div className={nestedPanelClass} key={String(item.id ?? index)}>
              <strong>{String(item.event ?? EMPTY_VALUE)}</strong>
              <p className={mutedTextClass}>Created: {formatDate(item.createdAt)}</p>
              <p className={mutedTextClass}>IP: {String(item.ipAddress ?? EMPTY_VALUE)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
