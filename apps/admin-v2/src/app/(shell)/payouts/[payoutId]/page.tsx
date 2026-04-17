import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminIdentity, getPayoutCase } from '../../../../lib/admin-api.server';
import { escalatePayoutAction } from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
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
  const [identity, payoutCase] = await Promise.all([getAdminIdentity(), getPayoutCase(payoutId)]);

  if (!payoutCase) {
    notFound();
  }

  const canManageEscalation = identity?.capabilities.includes(`payouts.escalate`) ?? false;
  const canSubmitEscalation = canManageEscalation && payoutCase.actionControls.canEscalate;
  const highValueThresholdLabel = payoutCase.highValue.thresholdAmount
    ? `${payoutCase.highValue.thresholdCurrency} >= ${payoutCase.highValue.thresholdAmount}`
    : `not configured`;

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Payout case</h1>
          <p className="muted mono">{payoutCase.id}</p>
          <div className="pillRow">
            <span className="pill">{payoutCase.core.type}</span>
            <span className="pill">{payoutCase.core.derivedStatus}</span>
            <span className="pill">{payoutCase.core.currencyCode}</span>
            <span className="pill">{payoutCase.highValue.eligibility}</span>
            {payoutCase.slaBreachDetected ? <span className="pill">threshold breached</span> : null}
            {payoutCase.payoutEscalation ? <span className="pill">escalated</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/payouts">
            Back to payouts
          </Link>
          <Link className="secondaryButton" href={`/ledger/${payoutCase.id}`}>
            Open ledger case
          </Link>
          <Link className="secondaryButton" href={`/consumers/${payoutCase.consumer.id}`}>
            Consumer case
          </Link>
          {payoutCase.paymentRequest ? (
            <Link className="secondaryButton" href={`/payments/${payoutCase.paymentRequest.id}`}>
              Payment request
            </Link>
          ) : null}
          {payoutCase.destinationPaymentMethodSummary ? (
            <Link
              className="secondaryButton"
              href={`/payment-methods/${payoutCase.destinationPaymentMethodSummary.id}`}
            >
              Destination method
            </Link>
          ) : null}
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Payout truth</h3>
          <p className="muted">
            Amount: {payoutCase.core.amount} {payoutCase.core.currencyCode}
          </p>
          <p className="muted">Persisted: {payoutCase.core.persistedStatus}</p>
          <p className="muted">Effective: {payoutCase.core.effectiveStatus}</p>
          <p className="muted">
            Derived payout status follows the latest ledger outcome, not a standalone payout table.
          </p>
        </article>
        <article className="panel">
          <h3>Destination</h3>
          {payoutCase.destinationPaymentMethodSummary ? (
            <>
              <p className="muted">{renderDestinationLabel(payoutCase.destinationPaymentMethodSummary)}</p>
              <p className="muted">Linkage: {payoutCase.destinationLinkageSource}</p>
              <p className="muted">Deleted: {formatDate(payoutCase.destinationPaymentMethodSummary.deletedAt)}</p>
            </>
          ) : (
            <>
              <p className="muted">Destination method unavailable.</p>
              <p className="muted">No schema-backed payout destination linkage could be confirmed for this case.</p>
            </>
          )}
        </article>
        <article className="panel">
          <h3>Threshold tuple</h3>
          <p className="muted">Threshold: {payoutCase.stuckPolicy.thresholdHours}h</p>
          <p className="muted">Breach condition: {payoutCase.stuckPolicy.breachCondition}</p>
          <p className="muted">Expected operator reaction: {payoutCase.stuckPolicy.expectedOperatorReaction}</p>
        </article>
        <article className="panel">
          <h3>High-value policy</h3>
          <p className="muted">Eligibility: {payoutCase.highValue.eligibility}</p>
          <p className="muted">Threshold rule: {highValueThresholdLabel}</p>
          <p className="muted">{payoutCase.highValuePolicy.wording}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Core links</h2>
          <div className="formStack">
            <p className="muted">Ledger id: {payoutCase.core.ledgerId}</p>
            <p className="muted">External reference: {payoutCase.core.externalReference ?? `-`}</p>
            <p className="muted">Outcome age: {payoutCase.outcomeAgeHours.toFixed(1)}h</p>
            <p className="muted">Updated: {formatDate(payoutCase.core.updatedAt)}</p>
            <p className="muted">Version: {payoutCase.version}</p>
          </div>
          {payoutCase.paymentRequest ? (
            <div className="formStack">
              <p className="muted">Linked payment request: {payoutCase.paymentRequest.id}</p>
              <p className="muted">
                {payoutCase.paymentRequest.amount} {payoutCase.paymentRequest.currencyCode} ·{` `}
                {payoutCase.paymentRequest.status}
              </p>
            </div>
          ) : (
            <p className="muted">No payment request is linked to this payout.</p>
          )}
        </article>
        <article className="panel">
          <h2>Metadata</h2>
          {renderMetadata(payoutCase.metadata)}
        </article>
      </section>

      {canManageEscalation || payoutCase.payoutEscalation ? (
        <section className="detailGrid">
          {canManageEscalation ? (
            <article className="panel">
              <h2>Payout escalation</h2>
              {canSubmitEscalation ? (
                <form action={escalatePayoutAction.bind(null, payoutCase.id)} className="formStack">
                  <input type="hidden" name="version" value={String(payoutCase.version)} />
                  <input type="hidden" name="consumerId" value={payoutCase.consumer.id} />
                  <input type="hidden" name="confirmed" value="false" />
                  <p className="muted">
                    Creates one durable escalation marker only. It does not mutate payout execution state, ledger
                    outcomes or destination linkage.
                  </p>
                  <label className="field">
                    <span>Reason</span>
                    <textarea
                      name="reason"
                      maxLength={500}
                      placeholder="Optional operational context for the audit trail."
                    />
                  </label>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                    Escalate payout
                  </button>
                </form>
              ) : (
                <div className="formStack">
                  <p className="muted">
                    {payoutCase.actionControls.escalateBlockedReason ??
                      `Payout escalation is not available for this case.`}
                  </p>
                </div>
              )}
            </article>
          ) : null}

          {payoutCase.payoutEscalation ? (
            <article className="panel">
              <h2>Active escalation marker</h2>
              <div className="formStack">
                <p className="muted">
                  Escalated by:{` `}
                  {payoutCase.payoutEscalation.escalatedBy.email ?? payoutCase.payoutEscalation.escalatedBy.id}
                </p>
                <p className="muted">Created: {formatDate(payoutCase.payoutEscalation.createdAt)}</p>
                <p className="muted">Confirmed: {payoutCase.payoutEscalation.confirmed ? `Yes` : `No`}</p>
                <p className="muted">Reason: {payoutCase.payoutEscalation.reason ?? `-`}</p>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      <section className="detailGrid">
        <article className="panel">
          <h2>Outcome timeline</h2>
          <div className="formStack">
            {payoutCase.outcomes.length === 0 ? <p className="muted">No outcomes.</p> : null}
            {payoutCase.outcomes.map((outcome) => (
              <div className="panel" key={outcome.id}>
                <strong>{outcome.status}</strong>
                <p className="muted">Source: {outcome.source ?? `-`}</p>
                <p className="muted">External id: {outcome.externalId ?? `-`}</p>
                <p className="muted">{formatDate(outcome.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Related ledger chain</h2>
          <div className="formStack">
            {payoutCase.relatedEntries.map((entry) => (
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

      <section className="panel">
        <h2>Audit context</h2>
        <div className="formStack">
          {payoutCase.auditContext.length === 0 ? <p className="muted">No related admin actions.</p> : null}
          {payoutCase.auditContext.map((item) => (
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
