import { type ReactNode } from 'react';

import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { TabletRow } from '../../../../components/tablet-row';
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

function renderRevokeForm(session: AdminSessionView): ReactNode {
  if (session.revokedAt || session.current === true) {
    return null;
  }
  return (
    <form action={revokeMyAdminSessionAction} className="formStack">
      <input type="hidden" name="sessionId" value={session.id} />
      <button className="dangerButton" type="submit">
        Revoke this session
      </button>
    </form>
  );
}

function SessionsMobileCards({ sessions }: { sessions: AdminSessionView[] }) {
  if (sessions.length === 0) {
    return (
      <div className="readSurface" data-view="mobile">
        <div className="panel muted">No sessions visible.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="mobile">
      <div className="queueCards">
        {sessions.map((s) => (
          <MobileQueueCard
            key={s.id}
            id={s.id}
            title={<span className="mono">{s.id}</span>}
            subtitle={
              <>
                Family: <span className="mono">{s.sessionFamilyId}</span>
              </>
            }
            trailing={<span className="pill">{statusLabel(s, s.current === true)}</span>}
          >
            <div className="muted">Created: {formatDate(s.createdAt)}</div>
            <div className="muted">Last used: {formatDate(s.lastUsedAt)}</div>
            <div className="muted">Expires: {formatDate(s.expiresAt)}</div>
            <div className="muted">Revoked: {formatDate(s.revokedAt)}</div>
            {renderRevokeForm(s)}
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function SessionsTabletRows({ sessions }: { sessions: AdminSessionView[] }) {
  if (sessions.length === 0) {
    return (
      <div className="readSurface" data-view="tablet">
        <div className="panel muted">No sessions visible.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="tablet">
      <div className="condensedList">
        {sessions.map((s) => (
          <TabletRow
            key={s.id}
            primary={
              <>
                <strong className="mono">{s.id}</strong>
                <div className="muted mono">{s.sessionFamilyId}</div>
                <div>
                  <span className="pill">{statusLabel(s, s.current === true)}</span>
                </div>
              </>
            }
            cells={[
              <div className="muted" key="created">
                Created: {formatDate(s.createdAt)}
              </div>,
              <div className="muted" key="lastUsed">
                Last used: {formatDate(s.lastUsedAt)}
              </div>,
              <div className="muted" key="expires">
                Expires/Revoked: {formatDate(s.expiresAt)} / {formatDate(s.revokedAt)}
              </div>,
              renderRevokeForm(s),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function SessionsDesktopTable({ sessions }: { sessions: AdminSessionView[] }) {
  return (
    <div className="readSurface" data-view="desktop">
      <DenseTable
        headers={[`Session`, `Status`, `Created`, `Last used`, `Expires`, `Revoked`, `Action`]}
        emptyMessage="No sessions visible."
      >
        {sessions.length === 0
          ? null
          : sessions.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="mono">{s.id}</div>
                  <div className="muted mono">Family: {s.sessionFamilyId}</div>
                </td>
                <td>
                  <span className="pill">{statusLabel(s, s.current === true)}</span>
                </td>
                <td>{formatDate(s.createdAt)}</td>
                <td>{formatDate(s.lastUsedAt)}</td>
                <td>{formatDate(s.expiresAt)}</td>
                <td>{formatDate(s.revokedAt)}</td>
                <td>{renderRevokeForm(s)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
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

      <section className="panel">
        {response === null ? <p className="muted">Sessions surface temporarily unavailable.</p> : null}
        <SessionsMobileCards sessions={sessions} />
        <SessionsTabletRows sessions={sessions} />
        <SessionsDesktopTable sessions={sessions} />
      </section>
    </>
  );
}
