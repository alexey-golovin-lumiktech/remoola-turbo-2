import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminIdentity, getAdmins, getLedgerEntryCase } from '../../../../lib/admin-api.server';
import {
  claimLedgerEntryAssignmentAction,
  reassignLedgerEntryAssignmentAction,
  releaseLedgerEntryAssignmentAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderObject(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

function describeAdmin(ref: { id: string; name: string | null; email: string | null } | null | undefined): string {
  if (!ref) return `-`;
  return ref.name ?? ref.email ?? ref.id;
}

export default async function LedgerEntryCasePage({ params }: { params: Promise<{ ledgerEntryId: string }> }) {
  const { ledgerEntryId } = await params;
  const [ledgerCase, identity] = await Promise.all([getLedgerEntryCase(ledgerEntryId), getAdminIdentity()]);

  if (!ledgerCase) {
    notFound();
  }

  const currentAssignment = ledgerCase.assignment.current;
  const history = ledgerCase.assignment.history;
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
      <section className="panel pageHeader">
        <div>
          <h1>Ledger Entry</h1>
          <p className="muted mono">{ledgerCase.id}</p>
          <div className="pillRow">
            <span className="pill">{ledgerCase.core.type}</span>
            <span className="pill">{ledgerCase.core.effectiveStatus}</span>
            <span className="pill">{ledgerCase.core.currencyCode}</span>
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href={`/consumers/${ledgerCase.consumer.id}`}>
            Consumer case
          </Link>
          {ledgerCase.paymentRequest ? (
            <Link className="secondaryButton" href={`/payments/${ledgerCase.paymentRequest.id}`}>
              Payment request
            </Link>
          ) : null}
          {ledgerCase.paymentRequest ? (
            <Link className="secondaryButton" href={`/audit/admin-actions?resourceId=${ledgerCase.paymentRequest.id}`}>
              Related admin actions
            </Link>
          ) : null}
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Core</h3>
          <p className="muted">Ledger id: {ledgerCase.core.ledgerId}</p>
          <p className="muted">
            Amount: {ledgerCase.core.amount} {ledgerCase.core.currencyCode}
          </p>
          <p className="muted">Persisted: {ledgerCase.core.persistedStatus}</p>
          <p className="muted">Effective: {ledgerCase.core.effectiveStatus}</p>
          <p className="muted">Case truth follows the latest outcome in the append-only chain.</p>
        </article>
        <article className="panel">
          <h3>Links</h3>
          <p className="muted">Consumer: {ledgerCase.consumer.email ?? ledgerCase.consumer.id}</p>
          <p className="muted">Payment request: {ledgerCase.paymentRequest?.id ?? `-`}</p>
          <p className="muted">Stripe id: {ledgerCase.core.stripeId ?? `-`}</p>
          <p className="muted">Idempotency key: {ledgerCase.core.idempotencyKey ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Fees and freshness</h3>
          <p className="muted">Fees type: {ledgerCase.core.feesType ?? `-`}</p>
          <p className="muted">Fees amount: {ledgerCase.core.feesAmount ?? `-`}</p>
          <p className="muted">Data freshness: {ledgerCase.dataFreshnessClass}</p>
          <p className="muted">Updated: {formatDate(ledgerCase.core.updatedAt)}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Metadata</h2>
          {renderObject(ledgerCase.metadata)}
        </article>
        <article className="panel">
          <h2>Outcome timeline</h2>
          <div className="formStack">
            {ledgerCase.outcomes.length === 0 ? <p className="muted">No outcomes.</p> : null}
            {ledgerCase.outcomes.map((outcome) => (
              <div className="panel" key={outcome.id}>
                <strong>{outcome.status}</strong>
                <p className="muted">Source: {outcome.source ?? `-`}</p>
                <p className="muted">External id: {outcome.externalId ?? `-`}</p>
                <p className="muted">{formatDate(outcome.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Dispute records</h2>
          <div className="formStack">
            {ledgerCase.disputes.length === 0 ? <p className="muted">No disputes.</p> : null}
            {ledgerCase.disputes.map((dispute) => (
              <div className="panel" key={dispute.id}>
                <strong>{dispute.stripeDisputeId}</strong>
                <p className="muted">{formatDate(dispute.createdAt)}</p>
                {renderObject(dispute.metadata)}
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Related ledger chain</h2>
          <div className="formStack">
            {ledgerCase.relatedEntries.map((entry) => (
              <div className="panel" key={entry.id}>
                <strong>{entry.type}</strong>
                <p className="muted">
                  {entry.amount} {entry.currencyCode}
                </p>
                <p className="muted">Effective status: {entry.effectiveStatus}</p>
                <div className="actionsRow">
                  <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                    Open entry
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel" aria-label="Assignment">
        <div className="pageHeader">
          <div>
            <h2>Assignment</h2>
            {currentAssignment ? (
              <>
                <p>
                  Currently assigned to: <strong>{describeAdmin(currentAssignment.assignedTo)}</strong>
                  {currentAssignment.assignedTo.email ? (
                    <span className="muted"> · {currentAssignment.assignedTo.email}</span>
                  ) : null}
                </p>
                <p className="muted">Since: {formatDate(currentAssignment.assignedAt)}</p>
                {currentAssignment.reason ? (
                  <p className="muted">Reason: &ldquo;{currentAssignment.reason}&rdquo;</p>
                ) : null}
                {currentAssignment.expiresAt ? (
                  <p className="muted">Expires: {formatDate(currentAssignment.expiresAt)}</p>
                ) : null}
              </>
            ) : (
              <p className="muted">Unassigned</p>
            )}
          </div>
        </div>
        <div className="actionsRow">
          {!currentAssignment ? (
            <form action={claimLedgerEntryAssignmentAction.bind(null, ledgerCase.id)} className="formStack">
              <label className="field">
                <span>Reason (optional)</span>
                <textarea name="reason" placeholder="Why are you claiming this entry?" maxLength={500} />
              </label>
              <button className="primaryButton" type="submit" disabled={!canClaim}>
                Claim
              </button>
            </form>
          ) : null}
          {currentAssignment ? (
            <form action={releaseLedgerEntryAssignmentAction.bind(null, ledgerCase.id)} className="formStack">
              <input type="hidden" name="assignmentId" value={currentAssignment.id} />
              <label className="field">
                <span>Reason (optional)</span>
                <textarea name="reason" placeholder="Why are you releasing?" maxLength={500} />
              </label>
              <button className="secondaryButton" type="submit" disabled={!canRelease}>
                Release
              </button>
            </form>
          ) : null}
          {canReassign && currentAssignment ? (
            <form action={reassignLedgerEntryAssignmentAction.bind(null, ledgerCase.id)} className="formStack">
              <input type="hidden" name="assignmentId" value={currentAssignment.id} />
              <input type="hidden" name="confirmed" value="false" />
              <label className="field">
                <span>New assignee</span>
                <select name="newAssigneeId" required defaultValue="">
                  <option value="" disabled>
                    Select an admin
                  </option>
                  {reassignCandidates.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Reason (required, min 10 chars)</span>
                <textarea name="reason" required minLength={10} maxLength={500} placeholder="Reason for reassignment" />
              </label>
              <label className="field">
                <span>Confirmation</span>
                <input type="checkbox" name="confirmed" value="true" required />
              </label>
              <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
                Reassign
              </button>
            </form>
          ) : null}
        </div>
        <details>
          <summary>Assignment history ({history.length})</summary>
          {history.length === 0 ? (
            <p className="muted">No previous assignments.</p>
          ) : (
            <ul className="formStack">
              {history.map((entry) => (
                <li className="panel" key={entry.id}>
                  <p>
                    <strong>{describeAdmin(entry.assignedTo)}</strong>
                    <span className="muted"> · claimed {formatDate(entry.assignedAt)}</span>
                  </p>
                  {entry.releasedAt ? (
                    <p className="muted">
                      Released {formatDate(entry.releasedAt)} by {describeAdmin(entry.releasedBy)}
                    </p>
                  ) : (
                    <p className="muted">Still active</p>
                  )}
                  {entry.reason ? <p className="muted">Reason: {entry.reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <section className="panel">
        <h2>Audit context</h2>
        <div className="formStack">
          {ledgerCase.auditContext.length === 0 ? <p className="muted">No related admin actions.</p> : null}
          {ledgerCase.auditContext.map((item) => (
            <div className="panel" key={item.id}>
              <strong>{item.action}</strong>
              <p className="muted">{item.adminEmail ?? `Unknown admin`}</p>
              <p className="muted">{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
