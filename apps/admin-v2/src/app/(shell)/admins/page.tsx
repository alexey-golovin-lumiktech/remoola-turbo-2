import Link from 'next/link';

import { getAdminIdentity, getAdmins } from '../../../lib/admin-api.server';
import { inviteAdminAction } from '../../../lib/admin-mutations.server';
import { ADMIN_V2_ROLE_OPTIONS } from '../../../lib/admin-rbac';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

export default async function AdminsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params?.page ?? 1) || 1;
  const q = params?.q?.trim() ?? ``;
  const status = params?.status?.trim() ?? ``;

  const [identity, admins] = await Promise.all([
    getAdminIdentity(),
    getAdmins({
      page,
      q,
      status,
    }),
  ]);

  const canManage = identity?.capabilities.includes(`admins.manage`) ?? false;

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Admins</h1>
          <p className="muted">
            Active and inactive admins, current schema-backed role posture, and exact lifecycle controls.
          </p>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href="/audit/admin-actions?action=admin_invite">
            Admin lifecycle audit
          </Link>
          <Link className="secondaryButton" href="/audit/auth">
            Auth audit
          </Link>
        </div>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Filter</h2>
          <form className="formStack">
            <label className="field">
              <span>Search</span>
              <input name="q" defaultValue={q} placeholder="email or admin id" />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <button className="primaryButton" type="submit">
              Apply filters
            </button>
          </form>
        </article>

        {canManage ? (
          <article className="panel">
            <h2>Invite admin</h2>
            <p className="muted">
              Invitations can target the full canonical MVP-2 schema-backed role set, without falling back to the
              bridge-era two-role posture.
            </p>
            <form action={inviteAdminAction} className="formStack">
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required placeholder="admin@example.com" />
              </label>
              <label className="field">
                <span>Role</span>
                <select name="roleKey" defaultValue="OPS_ADMIN">
                  {ADMIN_V2_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.key}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primaryButton" type="submit">
                Send invitation
              </button>
            </form>
          </article>
        ) : null}
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Admins</h2>
            <p className="muted">
              {admins?.total ?? 0} total, page {admins?.page ?? 1}
            </p>
          </div>
        </div>
        <div className="formStack">
          {admins?.items.length ? null : <p className="muted">No admins matched this filter.</p>}
          {admins?.items.map((admin) => (
            <div key={admin.id} className="panel">
              <div className="pageHeader">
                <div>
                  <Link href={`/admins/${admin.id}`}>
                    <strong>{admin.email}</strong>
                  </Link>
                  <p className="muted mono">{admin.id}</p>
                  <div className="pillRow">
                    <span className="pill">{admin.status}</span>
                    <span className="pill">{admin.role ?? admin.type}</span>
                    <span className="pill">{admin.type}</span>
                  </div>
                </div>
                <div>
                  <p className="muted">Last activity: {formatDate(admin.lastActivityAt)}</p>
                  <p className="muted">Updated: {formatDate(admin.updatedAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Pending invitations</h2>
        <div className="formStack">
          {admins?.pendingInvitations.length ? null : <p className="muted">No pending invitations.</p>}
          {admins?.pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="panel">
              <strong>{invitation.email}</strong>
              <div className="pillRow">
                <span className="pill">{invitation.role}</span>
                <span className="pill">{invitation.status}</span>
              </div>
              <p className="muted">Invited by: {invitation.invitedBy?.email ?? `Unknown`}</p>
              <p className="muted">Created: {formatDate(invitation.createdAt)}</p>
              <p className="muted">Expires: {formatDate(invitation.expiresAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
