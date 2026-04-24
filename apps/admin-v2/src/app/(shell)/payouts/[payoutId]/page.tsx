import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { AssignmentCard } from '../../../../components/assignment-card';
import { Panel } from '../../../../components/panel';
import { TinyPill } from '../../../../components/tiny-pill';
import {
  checkboxFieldClass,
  checkboxInputClass,
  dangerButtonClass,
  fieldClass,
  fieldLabelClass,
  monoMutedTextClass,
  mutedTextClass,
  panelClass,
  stackClass,
  textAreaClass,
} from '../../../../components/ui-classes';
import { getAdminIdentity, getAdmins, getPayoutCaseResult } from '../../../../lib/admin-api.server';
import {
  claimPayoutAssignmentAction,
  escalatePayoutAction,
  reassignPayoutAssignmentAction,
  releasePayoutAssignmentAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className={mutedTextClass}>No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

function renderDestinationLabel(paymentMethod: {
  type: string;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
}) {
  const suffix = paymentMethod.last4 ?? paymentMethod.bankLast4 ?? `----`;
  return paymentMethod.brand ? `${paymentMethod.brand} •••• ${suffix}` : `${paymentMethod.type} •••• ${suffix}`;
}

export default async function PayoutCasePage({ params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = await params;
  const [identity, payoutCaseResult] = await Promise.all([getAdminIdentity(), getPayoutCaseResult(payoutId)]);

  if (payoutCaseResult.status === `not_found`) {
    notFound();
  }
  if (payoutCaseResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Payout case unavailable"
        description="Your admin identity can sign in, but it cannot access this payout surface."
      />
    );
  }
  if (payoutCaseResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Payout case unavailable"
        description="The payout case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const payoutCase = payoutCaseResult.data;

  const canManageEscalation = identity?.capabilities.includes(`payouts.escalate`) ?? false;
  const canSubmitEscalation = canManageEscalation && payoutCase.actionControls.canEscalate;
  const highValueThresholdLabel = payoutCase.highValue.thresholdAmount
    ? `${payoutCase.highValue.thresholdCurrency} >= ${payoutCase.highValue.thresholdAmount}`
    : `not configured`;

  const currentAssignment = payoutCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  const reassignCandidatesResponse = canReassign ? await getAdmins({ page: 1, pageSize: 50, status: `ACTIVE` }) : null;
  const reassignCandidates = (reassignCandidatesResponse?.items ?? []).filter(
    (admin) => admin.id !== currentAssignment?.assignedTo.id,
  );

  return (
    <>
      <Panel
        title="Payout case"
        description={payoutCase.id}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionGhost href="/payouts">Back to payouts</ActionGhost>
            <ActionGhost href={`/ledger/${payoutCase.id}`}>Open ledger case</ActionGhost>
            <ActionGhost href={`/consumers/${payoutCase.consumer.id}`}>Consumer case</ActionGhost>
            {payoutCase.paymentRequest ? (
              <ActionGhost href={`/payments/${payoutCase.paymentRequest.id}`}>Payment request</ActionGhost>
            ) : null}
            {payoutCase.destinationPaymentMethodSummary ? (
              <ActionGhost href={`/payment-methods/${payoutCase.destinationPaymentMethodSummary.id}`}>
                Destination method
              </ActionGhost>
            ) : null}
          </div>
        }
      >
        <p className={monoMutedTextClass}>{payoutCase.id}</p>
        <div className="pillRow">
          <TinyPill>{payoutCase.core.type}</TinyPill>
          <TinyPill>{payoutCase.core.derivedStatus}</TinyPill>
          <TinyPill>{payoutCase.core.currencyCode}</TinyPill>
          <TinyPill>{payoutCase.highValue.eligibility}</TinyPill>
          {payoutCase.slaBreachDetected ? <TinyPill>threshold breached</TinyPill> : null}
          {payoutCase.payoutEscalation ? <TinyPill>escalated</TinyPill> : null}
        </div>
      </Panel>

      <section className="statsGrid">
        <Panel>
          <h3>Payout status</h3>
          <p className={mutedTextClass}>
            Amount: {payoutCase.core.amount} {payoutCase.core.currencyCode}
          </p>
          <p className={mutedTextClass}>Persisted: {payoutCase.core.persistedStatus}</p>
          <p className={mutedTextClass}>Effective: {payoutCase.core.effectiveStatus}</p>
          <p className={mutedTextClass}>
            Current payout status follows the latest ledger outcome, not a separate payout table.
          </p>
        </Panel>
        <Panel>
          <h3>Destination</h3>
          {payoutCase.destinationPaymentMethodSummary ? (
            <>
              <p className={mutedTextClass}>{renderDestinationLabel(payoutCase.destinationPaymentMethodSummary)}</p>
              <p className={mutedTextClass}>Linkage: {payoutCase.destinationLinkageSource}</p>
              <p className={mutedTextClass}>
                Deleted: {formatDate(payoutCase.destinationPaymentMethodSummary.deletedAt)}
              </p>
            </>
          ) : (
            <>
              <p className={mutedTextClass}>Destination method unavailable.</p>
              <p className={mutedTextClass}>No payout destination link could be confirmed for this case.</p>
            </>
          )}
        </Panel>
        <Panel>
          <h3>Threshold details</h3>
          <p className={mutedTextClass}>Threshold: {payoutCase.stuckPolicy.thresholdHours}h</p>
          <p className={mutedTextClass}>Breach condition: {payoutCase.stuckPolicy.breachCondition}</p>
          <p className={mutedTextClass}>Expected follow-up: {payoutCase.stuckPolicy.expectedOperatorReaction}</p>
        </Panel>
        <Panel>
          <h3>High-value policy</h3>
          <p className={mutedTextClass}>Eligibility: {payoutCase.highValue.eligibility}</p>
          <p className={mutedTextClass}>Threshold rule: {highValueThresholdLabel}</p>
          <p className={mutedTextClass}>{payoutCase.highValuePolicy.wording}</p>
        </Panel>
      </section>

      <section className="detailGrid">
        <Panel title="Core links">
          <div className={stackClass}>
            <p className={mutedTextClass}>Ledger id: {payoutCase.core.ledgerId}</p>
            <p className={mutedTextClass}>External reference: {payoutCase.core.externalReference ?? `-`}</p>
            <p className={mutedTextClass}>Outcome age: {payoutCase.outcomeAgeHours.toFixed(1)}h</p>
            <p className={mutedTextClass}>Updated: {formatDate(payoutCase.core.updatedAt)}</p>
            <p className={mutedTextClass}>Version: {payoutCase.version}</p>
          </div>
          {payoutCase.paymentRequest ? (
            <div className={stackClass}>
              <p className={mutedTextClass}>Linked payment request: {payoutCase.paymentRequest.id}</p>
              <p className={mutedTextClass}>
                {payoutCase.paymentRequest.amount} {payoutCase.paymentRequest.currencyCode} ·{` `}
                {payoutCase.paymentRequest.status}
              </p>
            </div>
          ) : (
            <p className={mutedTextClass}>No payment request is linked to this payout.</p>
          )}
        </Panel>
        <Panel title="Metadata">{renderMetadata(payoutCase.metadata)}</Panel>
      </section>

      {canManageEscalation || payoutCase.payoutEscalation ? (
        <section className="detailGrid">
          {canManageEscalation ? (
            <Panel title="Payout escalation">
              {canSubmitEscalation ? (
                <form action={escalatePayoutAction.bind(null, payoutCase.id)} className={stackClass}>
                  <input type="hidden" name="version" value={String(payoutCase.version)} />
                  <input type="hidden" name="consumerId" value={payoutCase.consumer.id} />
                  <input type="hidden" name="confirmed" value="false" />
                  <p className={mutedTextClass}>
                    Creates an escalation record only. It does not change payout state, ledger outcomes, or destination
                    links.
                  </p>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      maxLength={500}
                      placeholder="Optional operational context for the audit trail."
                    />
                  </label>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                  <button className={dangerButtonClass} type="submit" name="confirmedSubmit" value="true">
                    Escalate payout
                  </button>
                </form>
              ) : (
                <div className={stackClass}>
                  <p className={mutedTextClass}>
                    {payoutCase.actionControls.escalateBlockedReason ??
                      `Payout escalation is not available for this case.`}
                  </p>
                </div>
              )}
            </Panel>
          ) : null}

          {payoutCase.payoutEscalation ? (
            <Panel title="Active escalation marker">
              <div className={stackClass}>
                <p className={mutedTextClass}>
                  Escalated by:{` `}
                  {payoutCase.payoutEscalation.escalatedBy.email ?? payoutCase.payoutEscalation.escalatedBy.id}
                </p>
                <p className={mutedTextClass}>Created: {formatDate(payoutCase.payoutEscalation.createdAt)}</p>
                <p className={mutedTextClass}>Confirmed: {payoutCase.payoutEscalation.confirmed ? `Yes` : `No`}</p>
                <p className={mutedTextClass}>Reason: {payoutCase.payoutEscalation.reason ?? `-`}</p>
              </div>
            </Panel>
          ) : null}
        </section>
      ) : null}

      <section className="detailGrid">
        <Panel title="Outcome timeline">
          <div className={stackClass}>
            {payoutCase.outcomes.length === 0 ? <p className={mutedTextClass}>No outcomes.</p> : null}
            {payoutCase.outcomes.map((outcome) => (
              <div className={panelClass} key={outcome.id}>
                <strong>{outcome.status}</strong>
                <p className={mutedTextClass}>Source: {outcome.source ?? `-`}</p>
                <p className={mutedTextClass}>External id: {outcome.externalId ?? `-`}</p>
                <p className={mutedTextClass}>{formatDate(outcome.createdAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Related ledger chain">
          <div className={stackClass}>
            {payoutCase.relatedEntries.map((entry) => (
              <div className={panelClass} key={entry.id}>
                <strong>{entry.type}</strong>
                <p className={mutedTextClass}>
                  {entry.amount} {entry.currencyCode}
                </p>
                <p className={mutedTextClass}>Effective status: {entry.effectiveStatus}</p>
                <div className="actionsRow">
                  <ActionGhost href={`/ledger/${entry.id}`}>Open entry</ActionGhost>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <AssignmentCard
        resourceId={payoutCase.id}
        assignment={payoutCase.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimPayoutAssignmentAction,
          release: releasePayoutAssignmentAction,
          reassign: reassignPayoutAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this payout?` }}
      />

      <Panel title="Audit context">
        <div className={stackClass}>
          {payoutCase.auditContext.length === 0 ? <p className={mutedTextClass}>No related admin actions.</p> : null}
          {payoutCase.auditContext.map((item) => (
            <div className={panelClass} key={item.id}>
              <strong>{item.action}</strong>
              <p className={mutedTextClass}>{item.adminEmail ?? `Unknown admin`}</p>
              <p className={mutedTextClass}>{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
