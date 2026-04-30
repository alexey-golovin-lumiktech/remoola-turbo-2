import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../../components/admin-surface-state';
import { fieldClass, fieldLabelClass, textInputClass } from '../../../../../components/ui-classes';
import { getAdminIdentity, getExchangeRuleCaseResult } from '../../../../../lib/admin-api.server';
import {
  pauseExchangeRuleAction,
  resumeExchangeRuleAction,
  runExchangeRuleNowAction,
} from '../../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined) {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderLastExecution(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="muted">No persisted execution summary.</p>;
  }
  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function ExchangeRuleCasePage({ params }: { params: Promise<{ ruleId: string }> }) {
  const { ruleId } = await params;
  const [identity, ruleResult] = await Promise.all([getAdminIdentity(), getExchangeRuleCaseResult(ruleId)]);

  if (ruleResult.status === `not_found`) {
    notFound();
  }
  if (ruleResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Exchange rule unavailable"
        description="Your admin identity can sign in, but it cannot access this exchange-rule surface."
      />
    );
  }
  if (ruleResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Exchange rule unavailable"
        description="The exchange-rule case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const rule = ruleResult.data;

  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Exchange rule</h1>
          <p className="muted">
            {rule.core.sourceCurrency}/{rule.core.targetCurrency} · {rule.core.enabled ? `Enabled` : `Paused`}
          </p>
          <p className="muted mono">{rule.id}</p>
          <div className="pillRow">
            <span className="pill">{rule.core.enabled ? `Enabled` : `Paused`}</span>
            <span className="pill">Version {rule.version}</span>
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/exchange/rules">
            Back to rules
          </Link>
          <Link className="secondaryButton" href={`/consumers/${rule.consumer.id}`}>
            Consumer case
          </Link>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Thresholds</h3>
          <p className="muted">Target balance: {rule.core.threshold}</p>
          <p className="muted">Max convert amount: {rule.core.maxConvertAmount ?? `-`}</p>
          <p className="muted">Interval: {rule.core.minIntervalMinutes} minutes</p>
        </article>
        <article className="panel">
          <h3>Timing</h3>
          <p className="muted">Last run: {formatDate(rule.core.lastRunAt)}</p>
          <p className="muted">Next run: {formatDate(rule.core.nextRunAt)}</p>
          <p className="muted">Updated: {formatDate(rule.updatedAt)}</p>
        </article>
        <article className="panel">
          <h3>Consumer</h3>
          <p className="muted">{rule.consumer.email ?? rule.consumer.id}</p>
          <p className="muted mono">{rule.consumer.id}</p>
          <p className="muted">Created: {formatDate(rule.core.createdAt)}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Latest persisted execution</h2>
          {renderLastExecution(rule.lastExecution)}
        </article>

        {canManage ? (
          <article className="panel">
            <h2>Allowed actions</h2>
            <div className="formStack">
              {rule.actionControls.canPause ? (
                <form action={pauseExchangeRuleAction.bind(null, rule.id)} className="formStack">
                  <input type="hidden" name="version" value={String(rule.version)} />
                  <input type="hidden" name="consumerId" value={rule.consumer.id} />
                  <button className="secondaryButton" type="submit">
                    Pause rule
                  </button>
                </form>
              ) : null}
              {rule.actionControls.canResume ? (
                <form action={resumeExchangeRuleAction.bind(null, rule.id)} className="formStack">
                  <input type="hidden" name="version" value={String(rule.version)} />
                  <input type="hidden" name="consumerId" value={rule.consumer.id} />
                  <button className="secondaryButton" type="submit">
                    Resume rule
                  </button>
                </form>
              ) : null}
              {rule.actionControls.canRunNow ? (
                <form action={runExchangeRuleNowAction.bind(null, rule.id)} className="formStack">
                  <input type="hidden" name="version" value={String(rule.version)} />
                  <input type="hidden" name="consumerId" value={rule.consumer.id} />
                  <p className="muted">
                    Manual run is protected by a strong idempotency key, strict version checks and single active
                    execution lock.
                  </p>
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
                  <button className="secondaryButton" type="submit">
                    Run now
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        ) : null}
      </section>
    </>
  );
}
