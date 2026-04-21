import { type AdminSessionView, getAdminIdentity, getMyAdminSessions } from '../../../../lib/admin-api.server';
import { revokeMyAdminSessionAction } from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : `-`;
}

function statusLabel(s: AdminSessionView, current: boolean): string {
  if (current) return `Current`;
  if (s.revokedAt) return s.invalidatedReason ?? `revoked`;
  return `Active`;
}

export default async function MySessionsPage() {
  const [identity, response] = await Promise.all([getAdminIdentity(), getMyAdminSessions()]);
  const sessions = response?.sessions ?? [];

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>My sessions</h1>
          <p className="muted">Active and recently revoked admin sessions for {identity?.email ?? `current admin`}.</p>
        </div>
      </section>

      <section className="formStack">
        {response === null ? <p className="muted">Sessions surface temporarily unavailable.</p> : null}
        {response !== null && sessions.length === 0 ? <p className="muted">No sessions visible.</p> : null}
        {sessions.map((s) => (
          <article key={s.id} className="panel">
            <div className="pageHeader">
              <div>
                <h3 className="mono">{s.id}</h3>
                <p className="muted">
                  Family: <span className="mono">{s.sessionFamilyId}</span>
                </p>
              </div>
              <span className="pill">{statusLabel(s, s.current === true)}</span>
            </div>
            <p className="muted">Created: {formatDate(s.createdAt)}</p>
            <p className="muted">Last used: {formatDate(s.lastUsedAt)}</p>
            <p className="muted">Expires: {formatDate(s.expiresAt)}</p>
            <p className="muted">Revoked: {formatDate(s.revokedAt)}</p>
            {!s.revokedAt && s.current !== true ? (
              <form action={revokeMyAdminSessionAction} className="formStack">
                <input type="hidden" name="sessionId" value={s.id} />
                <button className="dangerButton" type="submit">
                  Revoke this session
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
