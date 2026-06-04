import { EMPTY_VALUE, formatDateTime } from '../../../../../lib/admin-format';
import { renderJson } from '../admin-shared';
import { type AdminCasePageData } from '../page.loader';

export function AdminAuditGrid({ admin }: { admin: AdminCasePageData[`admin`] }) {
  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Recent admin actions</h2>
        <div className="formStack">
          {admin.recentAuditActions.length === 0 ? <p className="muted">No recent admin actions.</p> : null}
          {admin.recentAuditActions.map((action) => (
            <div key={action.id} className="panel">
              <strong>{action.action}</strong>
              <p className="muted">
                {action.resource}
                {action.resourceId ? ` · ${action.resourceId}` : ``}
              </p>
              <p className="muted">Actor: {action.actorEmail}</p>
              <p className="muted">At: {formatDateTime(action.createdAt)}</p>
              {renderJson(action.metadata)}
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Recent auth events</h2>
        <div className="formStack">
          {admin.recentAuthEvents.length === 0 ? <p className="muted">No recent auth events.</p> : null}
          {admin.recentAuthEvents.map((event) => (
            <div key={event.id} className="panel">
              <strong>{event.event}</strong>
              <p className="muted">At: {formatDateTime(event.createdAt)}</p>
              <p className="muted">IP: {event.ipAddress ?? EMPTY_VALUE}</p>
              <p className="muted">UA: {event.userAgent ?? EMPTY_VALUE}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Related invitations</h2>
        <div className="formStack">
          {admin.invitations.length === 0 ? <p className="muted">No related invitations.</p> : null}
          {admin.invitations.map((invitation) => (
            <div key={invitation.id} className="panel">
              <strong>{invitation.email}</strong>
              <div className="pillRow">
                <span className="pill">{invitation.role}</span>
                <span className="pill">{invitation.status}</span>
              </div>
              <p className="muted">Created: {formatDateTime(invitation.createdAt)}</p>
              <p className="muted">Accepted: {formatDateTime(invitation.acceptedAt)}</p>
              <p className="muted">Expires: {formatDateTime(invitation.expiresAt)}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
