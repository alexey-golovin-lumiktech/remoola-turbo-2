import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { StatusPill } from '../../../../../components/status-pill';
import { type ConsumerPageData } from '../page.loader';
import { nestedCardClass } from '../preview-helpers';

export function ConsumerContextRail({
  consumer,
  backToQueueHref,
  totalPaymentRequests,
}: {
  consumer: ConsumerPageData[`consumer`];
  backToQueueHref: string;
  totalPaymentRequests: number;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat
          label="Verification"
          value={consumer.verificationStatus}
          tone={consumer.verified ? `emerald` : `amber`}
        />
        <ContextStat
          label="Active flags"
          value={consumer._count.adminFlags}
          tone={consumer._count.adminFlags > 0 ? `amber` : `neutral`}
        />
        <ContextStat label="Internal notes" value={consumer._count.adminNotes} />
        <ContextStat label="Payment methods" value={consumer._count.paymentMethods} />
      </div>
      <div className="contextRailSection">
        <h4>Case posture</h4>
        <div className={nestedCardClass}>
          <div className="pillRow">
            <StatusPill status={consumer.verificationStatus} />
            <span className="pill">{consumer.accountType}</span>
            {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
            {consumer.suspendedAt ? (
              <span className="pill" data-tone="rose">
                Suspended
              </span>
            ) : null}
          </div>
          <p className="muted mt-3">Stripe identity: {consumer.stripeIdentityStatus ?? `No Stripe state`}</p>
          <p className="muted">Recent requests: {totalPaymentRequests}</p>
          <p className="muted">Ledger entries: {consumer._count.ledgerEntries}</p>
        </div>
      </div>
      <div className="contextRailSection">
        <h4>Jump to</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/verification/${consumer.id}`}>Verification case</ActionGhost>
          <ActionGhost href={`/payment-methods?consumerId=${consumer.id}&includeDeleted=true`}>
            Payment methods
          </ActionGhost>
          <ActionGhost href={`/audit/consumer-actions?consumerId=${consumer.id}`}>Consumer actions</ActionGhost>
          <ActionGhost href={`/audit/admin-actions?resourceId=${consumer.id}`}>Related admin actions</ActionGhost>
        </div>
      </div>
    </>
  );
}
