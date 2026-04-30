import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../../components/admin-surface-state';
import { fieldClass, fieldLabelClass, textInputClass } from '../../../../../components/ui-classes';
import { getAdminIdentity, getExchangeRateCaseResult } from '../../../../../lib/admin-api.server';
import { approveExchangeRateAction } from '../../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function ExchangeRateCasePage({ params }: { params: Promise<{ rateId: string }> }) {
  const { rateId } = await params;
  const [identity, rateResult] = await Promise.all([getAdminIdentity(), getExchangeRateCaseResult(rateId)]);

  if (rateResult.status === `not_found`) {
    notFound();
  }
  if (rateResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Exchange rate unavailable"
        description="Your admin identity can sign in, but it cannot access this exchange-rate surface."
      />
    );
  }
  if (rateResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Exchange rate unavailable"
        description="The exchange-rate case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const rate = rateResult.data;

  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Exchange rate</h1>
          <p className="muted">
            {rate.core.sourceCurrency}/{rate.core.targetCurrency} · {rate.core.status}
          </p>
          <p className="muted mono">{rate.id}</p>
          <div className="pillRow">
            <span className="pill">{rate.core.status}</span>
            {rate.stalenessIndicator.isStale ? (
              <span className="pill">Stale</span>
            ) : (
              <span className="pill">Fresh</span>
            )}
            {rate.actionControls.canApprove ? <span className="pill">Approval pending</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange/rates">
            Back to rates
          </Link>
          <Link
            className="secondaryButton"
            href={`/exchange/rates?fromCurrency=${rate.core.sourceCurrency}&toCurrency=${rate.core.targetCurrency}`}
          >
            Pair history
          </Link>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Rate tuple</h3>
          <p className="muted">Rate: {rate.core.rate}</p>
          <p className="muted">Inverse: {rate.core.inverseRate ?? `-`}</p>
          <p className="muted">Spread: {rate.core.spreadBps ?? `-`} bps</p>
          <p className="muted">Confidence: {rate.core.confidence ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Provider context</h3>
          <p className="muted">Provider: {rate.core.provider ?? `-`}</p>
          <p className="muted">Provider rate id: {rate.core.providerRateId ?? `-`}</p>
          <p className="muted">Fetched: {formatDate(rate.core.fetchedAt)}</p>
        </article>
        <article className="panel">
          <h3>Staleness</h3>
          <p className="muted">Reference: {formatDate(rate.stalenessIndicator.referenceAt)}</p>
          <p className="muted">Age: {rate.stalenessIndicator.ageMinutes} minutes</p>
          <p className="muted">Threshold: {rate.stalenessIndicator.thresholdMinutes} minutes</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Lifecycle</h2>
          <div className="formStack">
            <p className="muted">Effective: {formatDate(rate.core.effectiveAt)}</p>
            <p className="muted">Expires: {formatDate(rate.core.expiresAt)}</p>
            <p className="muted">Approved at: {formatDate(rate.core.approvedAt)}</p>
            <p className="muted">Approved by: {rate.core.approvedBy ?? `-`}</p>
            <p className="muted">Created: {formatDate(rate.core.createdAt)}</p>
            <p className="muted">Version: {rate.version}</p>
          </div>
        </article>

        <article className="panel">
          <h2>Approval history</h2>
          <div className="formStack">
            {rate.approvalHistory.length === 0 ? <p className="muted">No approval audit entries yet.</p> : null}
            {rate.approvalHistory.map((item) => (
              <div className="panel" key={item.id}>
                <strong>{item.action}</strong>
                <p className="muted">{item.admin.email ?? item.admin.id}</p>
                <p className="muted">{formatDate(item.createdAt)}</p>
                <pre className="mono">{JSON.stringify(item.metadata, null, 2)}</pre>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canManage ? (
        <section className="panel">
          <h2>Allowed actions</h2>
          {rate.actionControls.canApprove ? (
            <form action={approveExchangeRateAction.bind(null, rate.id)} className="formStack">
              <input type="hidden" name="version" value={String(rate.version)} />
              <input type="hidden" name="confirmed" value="false" />
              <label className="field">
                <span>Approval reason</span>
                <textarea name="reason" required maxLength={500} placeholder="Mandatory approval reason for audit." />
              </label>
              <label className="field">
                <span>Confirmation</span>
                <input type="checkbox" name="confirmed" value="true" required />
              </label>
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Current password</span>
                <input
                  className={textInputClass}
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Confirm with your current password"
                />
              </label>
              <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                Approve exchange rate
              </button>
            </form>
          ) : (
            <p className="muted">Only draft rates can be approved in this slice.</p>
          )}
        </section>
      ) : null}
    </>
  );
}
