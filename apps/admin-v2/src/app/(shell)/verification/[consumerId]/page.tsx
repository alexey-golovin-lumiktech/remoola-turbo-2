import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getVerificationCase } from '../../../../lib/admin-api.server';
import {
  approveVerificationAction,
  flagVerificationAction,
  forceLogoutConsumerAction,
  rejectVerificationAction,
  requestInfoVerificationAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function VerificationCasePage({ params }: { params: Promise<{ consumerId: string }> }) {
  const { consumerId } = await params;
  const verificationCase = await getVerificationCase(consumerId);

  if (!verificationCase) {
    notFound();
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Verification Case</h1>
          <p className="muted">{verificationCase.email}</p>
          <p className="muted mono">{verificationCase.id}</p>
          <div className="pillRow">
            <span className="pill">{verificationCase.verificationStatus}</span>
            <span className="pill">{verificationCase.accountType}</span>
            {verificationCase.contractorKind ? <span className="pill">{verificationCase.contractorKind}</span> : null}
            {verificationCase.verificationSla.breached ? <span className="pill">SLA breached</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href={`/consumers/${verificationCase.id}`}>
            Open consumer case
          </Link>
          <Link className="secondaryButton" href={`/audit/admin-actions?resourceId=${verificationCase.id}`}>
            Related admin actions
          </Link>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Decision state</h3>
          <p className="muted">Version: {verificationCase.version}</p>
          <p className="muted">Reason: {verificationCase.verificationReason ?? `-`}</p>
          <p className="muted">Verification updated: {formatDate(verificationCase.verificationUpdatedAt)}</p>
          <p className="muted">Stripe status: {verificationCase.stripeIdentityStatus ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Auth risk</h3>
          <p className="muted">Login failures 24h: {verificationCase.authRisk.loginFailures24h}</p>
          <p className="muted">Refresh reuse 30d: {verificationCase.authRisk.refreshReuse30d}</p>
          <p className="muted">SLA computed: {formatDate(verificationCase.verificationSla.lastComputedAt)}</p>
        </article>
        <article className="panel">
          <h3>Profile and docs</h3>
          <p className="muted">Contacts: {verificationCase._count.contacts}</p>
          <p className="muted">Documents: {verificationCase._count.consumerResources}</p>
          <p className="muted">Payment methods: {verificationCase._count.paymentMethods}</p>
          <p className="muted">Recent payment requests: {verificationCase.recentPaymentRequests.length}</p>
        </article>
      </section>

      {verificationCase.decisionControls.canDecide || verificationCase.decisionControls.canForceLogout ? (
        <section className="detailGrid">
          {verificationCase.decisionControls.canDecide ? (
            <>
              <article className="panel">
                <h2>Approve</h2>
                <form action={approveVerificationAction.bind(null, verificationCase.id)} className="formStack">
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className="field">
                    <span>Reason (optional)</span>
                    <textarea name="reason" placeholder="Optional approval note" />
                  </label>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="primaryButton" type="submit" name="confirmedSubmit" value="true">
                    Approve verification
                  </button>
                </form>
              </article>
              <article className="panel">
                <h2>Request Info</h2>
                <form action={requestInfoVerificationAction.bind(null, verificationCase.id)} className="formStack">
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className="field">
                    <span>Reason (optional)</span>
                    <textarea name="reason" placeholder="What the operator needs from the consumer" />
                  </label>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                    Request more info
                  </button>
                </form>
              </article>
              <article className="panel">
                <h2>Flag</h2>
                <form action={flagVerificationAction.bind(null, verificationCase.id)} className="formStack">
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className="field">
                    <span>Reason (optional)</span>
                    <textarea name="reason" placeholder="Optional flag note" />
                  </label>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
                    Flag verification
                  </button>
                </form>
              </article>
              <article className="panel">
                <h2>Reject</h2>
                <form action={rejectVerificationAction.bind(null, verificationCase.id)} className="formStack">
                  <input type="hidden" name="version" value={String(verificationCase.version)} />
                  <input type="hidden" name="confirmed" value="false" />
                  <label className="field">
                    <span>Reason</span>
                    <textarea name="reason" required placeholder="Reject reason is required" />
                  </label>
                  <label className="field">
                    <span>Confirmation</span>
                    <input type="checkbox" name="confirmed" value="true" required />
                  </label>
                  <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
                    Reject verification
                  </button>
                </form>
              </article>
            </>
          ) : null}

          {verificationCase.decisionControls.canForceLogout ? (
            <article className="panel">
              <h2>Force Logout</h2>
              <form action={forceLogoutConsumerAction.bind(null, verificationCase.id)} className="formStack">
                <input type="hidden" name="confirmed" value="false" />
                <label className="field">
                  <span>Confirmation</span>
                  <input type="checkbox" name="confirmed" value="true" required />
                </label>
                <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
                  Revoke all consumer sessions
                </button>
              </form>
            </article>
          ) : null}
        </section>
      ) : null}

      <section className="detailGrid">
        <article className="panel">
          <h2>Decision history</h2>
          {verificationCase.decisionHistory.length === 0 ? (
            <p className="muted">No verification decisions yet.</p>
          ) : null}
          <div className="formStack">
            {verificationCase.decisionHistory.map((item, index) => (
              <div className="panel" key={String(item.id ?? index)}>
                <strong>{String(item.action ?? `-`)}</strong>
                <p className="muted">
                  Admin: {String((item as { admin?: { email?: string } }).admin?.email ?? item.adminId ?? `-`)}
                </p>
                <p className="muted">
                  Created: {formatDate(typeof item.createdAt === `string` ? item.createdAt : null)}
                </p>
                <pre className="mono">{JSON.stringify(item.metadata ?? {}, null, 2)}</pre>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Recent auth events</h2>
          {verificationCase.authRisk.recentEvents.length === 0 ? <p className="muted">No recent auth events.</p> : null}
          <div className="formStack">
            {verificationCase.authRisk.recentEvents.map((item, index) => (
              <div className="panel" key={String(item.id ?? index)}>
                <strong>{String(item.event ?? `-`)}</strong>
                <p className="muted">
                  Created: {formatDate(typeof item.createdAt === `string` ? item.createdAt : null)}
                </p>
                <p className="muted">IP: {String(item.ipAddress ?? `-`)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
