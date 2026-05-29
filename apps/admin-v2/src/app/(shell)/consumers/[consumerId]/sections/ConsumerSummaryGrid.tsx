import { Panel } from '../../../../../components/panel';
import { type ConsumerPageData } from '../page.loader';
import { type ConsumerPagePermissions } from '../page.permissions';
import { formatDate } from '../preview-helpers';

export function ConsumerSummaryGrid({
  consumer,
  permissions,
}: {
  consumer: ConsumerPageData[`consumer`];
  permissions: ConsumerPagePermissions;
}) {
  const { canForceLogout, canSuspend, canResendEmail } = permissions;
  return (
    <section className="statsGrid">
      <Panel surface="meta">
        <h3>Case summary</h3>
        <p className="muted">Email: {consumer.email ?? `-`}</p>
        <p className="muted">Consumer id: {consumer.id}</p>
        <p className="muted">Account type: {consumer.accountType}</p>
        <p className="muted">Contractor kind: {consumer.contractorKind ?? `-`}</p>
        <p className="muted">Updated: {formatDate(consumer.updatedAt)}</p>
      </Panel>
      <Panel surface="meta">
        <h3>Immediate signals</h3>
        <p className="muted">Verification: {consumer.verificationStatus}</p>
        <p className="muted">Stripe identity: {consumer.stripeIdentityStatus ?? `No Stripe state`}</p>
        <p className="muted">Suspended: {consumer.suspendedAt ? `Yes` : `No`}</p>
        <p className="muted">Flags: {consumer._count.adminFlags}</p>
        <p className="muted">Notes: {consumer._count.adminNotes}</p>
      </Panel>
      <Panel surface="meta">
        <h3>Quick actions</h3>
        <p className="muted">
          Use verification and audit links above for navigation. Sensitive consumer actions stay separated below.
        </p>
        <div className="pillRow">
          {canForceLogout ? <span className="pill">Force logout available</span> : null}
          {canSuspend ? <span className="pill">Suspend available</span> : null}
          {canResendEmail ? <span className="pill">Email resend available</span> : null}
          {!canForceLogout && !canSuspend && !canResendEmail ? (
            <span className="pill">Read-only support tools</span>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}
