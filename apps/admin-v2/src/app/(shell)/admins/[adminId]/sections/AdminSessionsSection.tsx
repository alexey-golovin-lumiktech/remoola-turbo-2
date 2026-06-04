import { formatDate } from '../../../../../lib/admin-format';
import { revokeAdminSessionAction } from '../../../../../lib/admin-mutations/admins.server';
import { type AdminCasePageData } from '../page.loader';

export function AdminSessionsSection({
  admin,
  sessionResult,
  sessions,
  canManage,
  isSelf,
}: {
  admin: AdminCasePageData[`admin`];
  sessionResult: AdminCasePageData[`sessionResult`];
  sessions: AdminCasePageData[`sessions`];
  canManage: boolean;
  isSelf: boolean;
}) {
  return (
    <section className="panel">
      <h2>Active sessions</h2>
      {sessionResult?.status === `forbidden` ? (
        <p className="muted">Session visibility is denied for this admin surface.</p>
      ) : null}
      {sessionResult?.status === `error` ? <p className="muted">Sessions surface temporarily unavailable.</p> : null}
      {sessionResult?.status === `ready` && sessions.length === 0 ? (
        <p className="muted">No sessions visible.</p>
      ) : null}
      <div className="formStack">
        {sessions.map((s) => (
          <article key={s.id} className="panel">
            <p className="mono">{s.id}</p>
            <p className="muted">
              Family: <span className="mono">{s.sessionFamilyId}</span>
            </p>
            <p className="muted">Created: {formatDate(s.createdAt)}</p>
            <p className="muted">Last used: {formatDate(s.lastUsedAt)}</p>
            <p className="muted">Expires: {formatDate(s.expiresAt)}</p>
            <p className="muted">Revoked: {formatDate(s.revokedAt)}</p>
            {s.invalidatedReason ? <p className="muted">Reason: {s.invalidatedReason}</p> : null}
            {canManage && !s.revokedAt && !isSelf ? (
              <form action={revokeAdminSessionAction.bind(null, admin.core.id, s.id)} className="formStack">
                <button className="dangerButton" type="submit">
                  Revoke session
                </button>
              </form>
            ) : null}
            {isSelf && !s.revokedAt ? <p className="errorText">Use My sessions for self-revoke.</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
