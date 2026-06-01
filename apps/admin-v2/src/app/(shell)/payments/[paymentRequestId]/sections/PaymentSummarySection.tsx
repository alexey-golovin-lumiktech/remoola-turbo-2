import { Panel } from '../../../../../components/panel';
import { mutedTextClass } from '../../../../../components/ui-classes';
import { type PaymentPageData } from '../page.loader';
import { type PaymentPagePermissions } from '../page.permissions';
import { formatDate, renderActorLabel } from '../payment-shared';

export function PaymentSummarySection({
  paymentCase,
  permissions,
}: {
  paymentCase: PaymentPageData[`paymentCase`];
  permissions: PaymentPagePermissions;
}) {
  const currentAssignment = paymentCase.assignment.current;
  const { canClaim, canRelease, canReassign } = permissions;
  return (
    <section className="statsGrid">
      <Panel surface="meta">
        <h3>Case summary</h3>
        <p className={mutedTextClass}>
          Amount: {paymentCase.core.amount} {paymentCase.core.currencyCode}
        </p>
        <p className={mutedTextClass}>Payment rail: {paymentCase.core.paymentRail ?? `-`}</p>
        <p className={mutedTextClass}>Payer: {renderActorLabel(paymentCase.payer)}</p>
        <p className={mutedTextClass}>Requester: {renderActorLabel(paymentCase.requester)}</p>
        <p className={mutedTextClass}>Updated: {formatDate(paymentCase.updatedAt)}</p>
      </Panel>
      <Panel surface="meta">
        <h3>Operational posture</h3>
        <p className={mutedTextClass}>Effective: {paymentCase.core.effectiveStatus}</p>
        <p className={mutedTextClass}>Persisted: {paymentCase.core.persistedStatus}</p>
        <p className={mutedTextClass}>Data freshness: {paymentCase.dataFreshnessClass}</p>
        <p className={mutedTextClass}>Assignment: {currentAssignment ? `Assigned` : `Unassigned`}</p>
        <p className={mutedTextClass}>Linked ledger entries: {paymentCase.ledgerEntries.length}</p>
      </Panel>
      <Panel surface="meta">
        <h3>Navigation</h3>
        <p className={mutedTextClass}>
          Queue and related-case navigation stay in the header above. Assignment controls stay separated so they do not
          compete with the case summary.
        </p>
        <div className="pillRow">
          <span className="pill">{canClaim ? `Claim available` : `Claim unavailable`}</span>
          <span className="pill">{canRelease ? `Release available` : `Release unavailable`}</span>
          <span className="pill">{canReassign ? `Reassign available` : `Reassign unavailable`}</span>
        </div>
      </Panel>
      <Panel>
        <h3>Request core</h3>
        <p className={mutedTextClass}>
          Amount: {paymentCase.core.amount} {paymentCase.core.currencyCode}
        </p>
        <p className={mutedTextClass}>Persisted: {paymentCase.core.persistedStatus}</p>
        <p className={mutedTextClass}>Effective: {paymentCase.core.effectiveStatus}</p>
        <p className={mutedTextClass}>Current status follows the latest linked ledger outcome, not the earliest one.</p>
        <p className={mutedTextClass}>Description: {paymentCase.core.description ?? `-`}</p>
      </Panel>
      <Panel>
        <h3>Participants</h3>
        <p className={mutedTextClass}>Payer: {paymentCase.payer.email ?? paymentCase.payer.id ?? `-`}</p>
        <p className={mutedTextClass}>Requester: {paymentCase.requester.email ?? paymentCase.requester.id ?? `-`}</p>
        <p className={mutedTextClass}>Data freshness: {paymentCase.dataFreshnessClass}</p>
      </Panel>
      <Panel>
        <h3>Dates</h3>
        <p className={mutedTextClass}>Created: {formatDate(paymentCase.core.createdAt)}</p>
        <p className={mutedTextClass}>Sent: {formatDate(paymentCase.core.sentDate)}</p>
        <p className={mutedTextClass}>Due: {formatDate(paymentCase.core.dueDate)}</p>
        <p className={mutedTextClass}>Updated: {formatDate(paymentCase.updatedAt)}</p>
        <p className={mutedTextClass}>Version: {paymentCase.version}</p>
      </Panel>
    </section>
  );
}
