import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AssignmentCard } from '../../../../../components/assignment-card';
import { getAdminIdentity, getAdmins, getExchangeScheduledCase } from '../../../../../lib/admin-api.server';
import {
  cancelScheduledExchangeAction,
  claimFxConversionAssignmentAction,
  forceExecuteScheduledExchangeAction,
  reassignFxConversionAssignmentAction,
  releaseFxConversionAssignmentAction,
} from '../../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function ExchangeScheduledCasePage({ params }: { params: Promise<{ conversionId: string }> }) {
  const { conversionId } = await params;
  const [identity, conversion] = await Promise.all([getAdminIdentity(), getExchangeScheduledCase(conversionId)]);

  if (!conversion) {
    notFound();
  }

  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;

  const currentAssignment = conversion.assignment.current;
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
          <h1>Scheduled FX conversion</h1>
          <p className="muted">
            {conversion.core.sourceCurrency}/{conversion.core.targetCurrency} · {conversion.core.status}
          </p>
          <p className="muted mono">{conversion.id}</p>
          <div className="pillRow">
            <span className="pill">{conversion.core.status}</span>
            <span className="pill">Attempts {conversion.core.attempts}</span>
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange/scheduled">
            Back to scheduled
          </Link>
          <Link className="secondaryButton" href={`/consumers/${conversion.consumer.id}`}>
            Consumer case
          </Link>
          {conversion.linkedRuleId ? (
            <Link className="secondaryButton" href={`/exchange/rules/${conversion.linkedRuleId}`}>
              Linked rule
            </Link>
          ) : null}
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Core</h3>
          <p className="muted">
            Amount: {conversion.core.amount} {conversion.core.sourceCurrency}
          </p>
          <p className="muted">Execute at: {formatDate(conversion.core.executeAt)}</p>
          <p className="muted">Updated: {formatDate(conversion.updatedAt)}</p>
          <p className="muted">Version: {conversion.version}</p>
        </article>
        <article className="panel">
          <h3>Timing</h3>
          <p className="muted">Processing: {formatDate(conversion.core.processingAt)}</p>
          <p className="muted">Executed: {formatDate(conversion.core.executedAt)}</p>
          <p className="muted">Failed: {formatDate(conversion.core.failedAt)}</p>
        </article>
        <article className="panel">
          <h3>Failure detail</h3>
          <p className="muted">{conversion.failureDetail ?? `No failure detail.`}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Linked ledger context</h2>
          <div className="formStack">
            {conversion.linkedLedgerEntries.length === 0 ? (
              <p className="muted">No ledger entries are linked to this conversion.</p>
            ) : null}
            {conversion.linkedLedgerEntries.map((entry) => (
              <div className="panel" key={entry.id}>
                <strong>{entry.type}</strong>
                <p className="muted">
                  {entry.amount} {entry.currencyCode}
                </p>
                <p className="muted">Effective status: {entry.effectiveStatus}</p>
                <p className="muted">Ledger id: {entry.ledgerId}</p>
                <div className="actionsRow">
                  <Link className="secondaryButton" href={`/ledger/${entry.id}`}>
                    Open ledger entry
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        {canManage ? (
          <article className="panel">
            <h2>Allowed actions</h2>
            <div className="formStack">
              {conversion.actionControls.canForceExecute ? (
                <form action={forceExecuteScheduledExchangeAction.bind(null, conversion.id)} className="formStack">
                  <input type="hidden" name="version" value={String(conversion.version)} />
                  <input type="hidden" name="consumerId" value={conversion.consumer.id} />
                  <input type="hidden" name="confirmed" value="false" />
                  <p className="muted">
                    Force execute is confirmation-gated and protected by a strong idempotency key plus a single active
                    executor lock.
                  </p>
                  <p className="muted">
                    Source amount: {conversion.core.amount} {conversion.core.sourceCurrency}
                  </p>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                    Force execute scheduled conversion
                  </button>
                </form>
              ) : null}

              {conversion.actionControls.canCancel ? (
                <form action={cancelScheduledExchangeAction.bind(null, conversion.id)} className="formStack">
                  <input type="hidden" name="version" value={String(conversion.version)} />
                  <input type="hidden" name="consumerId" value={conversion.consumer.id} />
                  <input type="hidden" name="confirmed" value="false" />
                  <p className="muted">Cancellation is limited to pending conversions only.</p>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                    Cancel scheduled conversion
                  </button>
                </form>
              ) : null}

              {!conversion.actionControls.canForceExecute && !conversion.actionControls.canCancel ? (
                <p className="muted">No canonical exchange actions are currently available for this conversion.</p>
              ) : null}
            </div>
          </article>
        ) : null}
      </section>

      <AssignmentCard
        resourceId={conversion.id}
        assignment={conversion.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimFxConversionAssignmentAction,
          release: releaseFxConversionAssignmentAction,
          reassign: reassignFxConversionAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this scheduled FX conversion?` }}
      />
    </>
  );
}
