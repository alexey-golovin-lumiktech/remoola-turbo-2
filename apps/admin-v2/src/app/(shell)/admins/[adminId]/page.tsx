// Admin case is intentionally a leaf surface — no canonical row in the Cross-links Matrix
// requires outbound investigation links from the admin case page.
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { getAdminCaseRecordResult, getAdminIdentity, getAdminSessionsResult } from '../../../../lib/admin-api.server';
import {
  changeAdminPermissionsAction,
  changeAdminRoleAction,
  deactivateAdminAction,
  resetAdminPasswordAction,
  restoreAdminAction,
  revokeAdminSessionAction,
} from '../../../../lib/admin-mutations.server';
import { ADMIN_V2_ROLE_OPTIONS } from '../../../../lib/admin-rbac';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderJson(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="muted">No metadata.</p>;
  }
  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function AdminCasePage({ params }: { params: Promise<{ adminId: string }> }) {
  const { adminId } = await params;
  const [identity, adminResult] = await Promise.all([getAdminIdentity(), getAdminCaseRecordResult(adminId)]);

  if (adminResult.status === `not_found`) {
    notFound();
  }
  if (adminResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Admin case unavailable"
        description="Your admin identity can sign in, but it cannot access this admin surface."
      />
    );
  }
  if (adminResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Admin case unavailable"
        description="The admin case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const admin = adminResult.data;

  const canManage = identity?.capabilities.includes(`admins.manage`) ?? false;
  const canReadSessions = identity?.capabilities.includes(`admins.read`) ?? false;
  const isSelf = identity?.id === admin.core.id;
  const sessionResult = canReadSessions ? await getAdminSessionsResult(admin.core.id) : null;
  const sessions = sessionResult?.status === `ready` ? sessionResult.data.sessions : [];
  const overrideModeByCapability = new Map(
    admin.accessProfile.permissionOverrides.map((override) => [
      override.capability,
      override.granted ? `grant` : `deny`,
    ]),
  );

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>{admin.core.email}</h1>
          <p className="muted mono">{admin.core.id}</p>
          <div className="pillRow">
            <span className="pill">{admin.core.status}</span>
            <span className="pill">{admin.accessProfile.resolvedRole ?? admin.core.role ?? admin.core.type}</span>
            <span className="pill">{admin.core.type}</span>
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href={admin.auditShortcuts.adminActionsHref}>
            Related admin actions
          </Link>
          <Link className="secondaryButton" href={admin.auditShortcuts.authHref}>
            Auth history
          </Link>
        </div>
      </section>

      <section className="statsGrid">
        <article className="panel">
          <h3>Lifecycle</h3>
          <p className="muted">Created: {formatDate(admin.core.createdAt)}</p>
          <p className="muted">Updated: {formatDate(admin.updatedAt)}</p>
          <p className="muted">Deactivated: {formatDate(admin.core.deletedAt)}</p>
          <p className="muted">Data freshness: {admin.dataFreshnessClass}</p>
        </article>
        <article className="panel">
          <h3>Access profile</h3>
          <p className="muted">Source: {admin.accessProfile.source}</p>
          <p className="muted">Resolved role: {admin.accessProfile.resolvedRole ?? `-`}</p>
          <p className="muted">Schema role: {admin.accessProfile.schemaRoleKey ?? `-`}</p>
          <p className="muted">Workspaces: {admin.accessProfile.workspaces.join(`, `) || `-`}</p>
        </article>
        <article className="panel">
          <h3>Historical integrity</h3>
          <p className="muted">Authored notes: {admin.authoredNotesCount}</p>
          <p className="muted">Authored flags: {admin.authoredFlagsCount}</p>
          <p className="muted">Settings theme: {admin.settings?.theme ?? `SYSTEM`}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Capabilities</h2>
          <div className="formStack">
            {admin.accessProfile.capabilities.length === 0 ? <p className="muted">No capabilities.</p> : null}
            {admin.accessProfile.capabilities.map((capability) => (
              <div key={capability} className="panel">
                <span className="mono">{capability}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Permission overrides</h2>
          <div className="formStack">
            {admin.accessProfile.permissionOverrides.length === 0 ? (
              <p className="muted">No explicit overrides.</p>
            ) : null}
            {admin.accessProfile.permissionOverrides.map((override) => (
              <div key={override.capability} className="panel">
                <strong className="mono">{override.capability}</strong>
                <p className="muted">Granted: {String(override.granted)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canManage ? (
        <section className="detailGrid">
          <article className="panel">
            <h2>Lifecycle actions</h2>
            <div className="formStack">
              {admin.core.status === `ACTIVE` ? (
                <form action={deactivateAdminAction.bind(null, admin.core.id)} className="formStack">
                  <input type="hidden" name="version" value={String(admin.version)} />
                  <label className="field">
                    <span>Reason</span>
                    <textarea
                      name="reason"
                      maxLength={500}
                      placeholder="Operational reason visible in audit log."
                      disabled={isSelf}
                    />
                  </label>
                  <label className="field">
                    <span>Confirm</span>
                    <input type="checkbox" name="confirmed" value="true" required disabled={isSelf} />
                  </label>
                  {isSelf ? <p className="errorText">Self-deactivate is blocked.</p> : null}
                  <button className="dangerButton" type="submit" name="confirmedSubmit" value="true" disabled={isSelf}>
                    Deactivate admin
                  </button>
                </form>
              ) : (
                <form action={restoreAdminAction.bind(null, admin.core.id)} className="formStack">
                  <input type="hidden" name="version" value={String(admin.version)} />
                  <button className="primaryButton" type="submit">
                    Restore admin
                  </button>
                </form>
              )}

              <form action={resetAdminPasswordAction.bind(null, admin.core.id)} className="formStack">
                <input type="hidden" name="version" value={String(admin.version)} />
                <button className="secondaryButton" type="submit" disabled={admin.core.status !== `ACTIVE`}>
                  Send password reset
                </button>
              </form>
            </div>
          </article>

          <article className="panel">
            <h2>Role change</h2>
            <p className="muted">Schema-backed lifecycle controls expose the full canonical MVP-2 admin role set.</p>
            <form action={changeAdminRoleAction.bind(null, admin.core.id)} className="formStack">
              <input type="hidden" name="version" value={String(admin.version)} />
              <label className="field">
                <span>Role</span>
                <select
                  name="roleKey"
                  defaultValue={admin.accessProfile.resolvedRole ?? admin.core.role ?? `OPS_ADMIN`}
                >
                  {ADMIN_V2_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Confirm</span>
                <input type="checkbox" name="confirmed" value="true" required />
              </label>
              <button className="primaryButton" type="submit" name="confirmedSubmit" value="true">
                Change role
              </button>
            </form>
          </article>

          <article className="panel">
            <h2>Permissions change</h2>
            <p className="muted">
              Explicit overrides stay schema-backed and operate as inherit, grant, or deny on the canonical admin-v2
              capability set.
            </p>
            <form action={changeAdminPermissionsAction.bind(null, admin.core.id)} className="formStack">
              <input type="hidden" name="version" value={String(admin.version)} />
              {admin.accessProfile.availablePermissionCapabilities.map((capability) => (
                <label key={capability} className="field">
                  <span className="mono">{capability}</span>
                  <select
                    name={`capability_override_${capability}`}
                    defaultValue={overrideModeByCapability.get(capability) ?? `inherit`}
                  >
                    <option value="inherit">inherit role baseline</option>
                    <option value="grant">explicit grant</option>
                    <option value="deny">explicit deny</option>
                  </select>
                </label>
              ))}
              <button className="primaryButton" type="submit">
                Save overrides
              </button>
            </form>
          </article>
        </section>
      ) : null}

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
                <p className="muted">At: {formatDate(action.createdAt)}</p>
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
                <p className="muted">At: {formatDate(event.createdAt)}</p>
                <p className="muted">IP: {event.ipAddress ?? `-`}</p>
                <p className="muted">UA: {event.userAgent ?? `-`}</p>
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
                <p className="muted">Created: {formatDate(invitation.createdAt)}</p>
                <p className="muted">Accepted: {formatDate(invitation.acceptedAt)}</p>
                <p className="muted">Expires: {formatDate(invitation.expiresAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canReadSessions ? (
        <section className="panel">
          <h2>Active sessions</h2>
          {sessionResult?.status === `forbidden` ? (
            <p className="muted">Session visibility is denied for this admin surface.</p>
          ) : null}
          {sessionResult?.status === `error` ? (
            <p className="muted">Sessions surface temporarily unavailable.</p>
          ) : null}
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
      ) : null}
    </>
  );
}
