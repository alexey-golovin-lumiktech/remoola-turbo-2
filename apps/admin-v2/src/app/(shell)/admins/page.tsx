import Link from 'next/link';

import { adminV2AdminsListQuerySchema } from '@remoola/api-types';

import { ActionGhost } from '../../../components/action-ghost';
import { PasswordConfirmationField } from '../../../components/admin-form-fields/password-confirmation-field';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { StatusPill } from '../../../components/status-pill';
import { TabletRow } from '../../../components/tablet-row';
import { buttonRowClass, fieldClass, fieldLabelClass, textInputClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getAdmins } from '../../../lib/admin-api/admins.server';
import { getAdminIdentity } from '../../../lib/admin-api/identity.server';
import { type AdminsListResponse } from '../../../lib/admin-api/types';
import { formatDate } from '../../../lib/admin-format';
import { inviteAdminAction } from '../../../lib/admin-mutations/admins.server';
import { ADMIN_V2_ROLE_OPTIONS } from '../../../lib/admin-rbac';
import { positiveIntegerSearchParam, trimmedSearchParam } from '../../../lib/query-contract';

type AdminListItem = AdminsListResponse[`items`][number];

function AdminPills({ admin }: { admin: AdminListItem }) {
  return (
    <div className="pillRow">
      <StatusPill status={admin.status} />
      <span className="pill">{admin.role ?? admin.type}</span>
      <span className="pill">{admin.type}</span>
    </div>
  );
}

function AdminsMobileCards({ admins }: { admins: AdminListItem[] }) {
  if (admins.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No admins matched this filter.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {admins.map((admin) => (
          <MobileQueueCard
            key={admin.id}
            id={admin.id}
            href={`/admins/${admin.id}`}
            title={admin.email}
            subtitle={<span className="mono">{admin.id}</span>}
          >
            <AdminPills admin={admin} />
            <div className="muted">Last activity: {formatDate(admin.lastActivityAt)}</div>
            <div className="muted">Updated: {formatDate(admin.updatedAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function AdminsTabletRows({ admins }: { admins: AdminListItem[] }) {
  if (admins.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No admins matched this filter.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {admins.map((admin) => (
          <TabletRow
            key={admin.id}
            primary={
              <>
                <Link href={`/admins/${admin.id}`}>
                  <strong>{admin.email}</strong>
                </Link>
                <div className="muted mono">{admin.id}</div>
              </>
            }
            cells={[
              <AdminPills admin={admin} key="pills" />,
              <div className="muted" key="lastActivity">
                Last activity: {formatDate(admin.lastActivityAt)}
              </div>,
              <div className="muted" key="updated">
                Updated: {formatDate(admin.updatedAt)}
              </div>,
              null,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function AdminsDesktopTable({ admins }: { admins: AdminListItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Admin`, `Status`, `Role`, `Type`, `Last activity`, `Updated`]}
        emptyMessage="No admins matched this filter."
      >
        {admins.length === 0
          ? null
          : admins.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <Link href={`/admins/${admin.id}`}>
                    <strong>{admin.email}</strong>
                  </Link>
                  <div className="muted mono">{admin.id}</div>
                </td>
                <td>
                  <StatusPill status={admin.status} />
                </td>
                <td>{admin.role ?? admin.type}</td>
                <td>{admin.type}</td>
                <td>{formatDate(admin.lastActivityAt)}</td>
                <td>{formatDate(admin.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function AdminsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = adminV2AdminsListQuerySchema.parse({
    page: positiveIntegerSearchParam(params?.page, 1),
    q: trimmedSearchParam(params?.q),
    status: trimmedSearchParam(params?.status),
  });
  const page = query.page ?? 1;
  const q = query.q ?? ``;
  const status = query.status ?? ``;

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
    <WorkspaceLayout workspace="admins">
      <>
        <Panel
          title="Admins"
          description="Active and inactive admins, current schema-backed role posture, and exact lifecycle controls."
          actions={
            <div className={buttonRowClass}>
              <ActionGhost href="/audit/admin-actions?action=admin_invite">Admin lifecycle audit</ActionGhost>
              <ActionGhost href="/audit/auth">Auth audit</ActionGhost>
            </div>
          }
        />

        <section className="detailGrid">
          <Panel title="Filter" description="Narrow the admin list by identifier or lifecycle state.">
            <form className="grid gap-3" method="get">
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Search</span>
                <input className={textInputClass} name="q" defaultValue={q} placeholder="email or admin id" />
              </label>
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Status</span>
                <select className={textInputClass} name="status" defaultValue={status}>
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <div className={buttonRowClass}>
                <ActionGhost type="submit">Apply filters</ActionGhost>
                <ActionGhost href="/admins">Reset</ActionGhost>
              </div>
            </form>
          </Panel>

          {canManage ? (
            <Panel
              title="Invite admin"
              description="Invitations support the full schema-backed admin role set available in this workspace."
            >
              <form action={inviteAdminAction} className="grid gap-3">
                <label className={fieldClass}>
                  <span className={fieldLabelClass}>Email</span>
                  <input
                    className={textInputClass}
                    name="email"
                    type="email"
                    required
                    placeholder="admin@example.com"
                  />
                </label>
                <label className={fieldClass}>
                  <span className={fieldLabelClass}>Role</span>
                  <select className={textInputClass} name="roleKey" defaultValue="OPS_ADMIN">
                    {ADMIN_V2_ROLE_OPTIONS.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.key}
                      </option>
                    ))}
                  </select>
                </label>
                <PasswordConfirmationField />
                <div className={buttonRowClass}>
                  <ActionGhost type="submit">Send invitation</ActionGhost>
                </div>
              </form>
            </Panel>
          ) : null}
        </section>

        <Panel title="Admins" description={`${admins?.total ?? 0} total · page ${admins?.page ?? 1}`}>
          <AdminsMobileCards admins={admins?.items ?? []} />
          <AdminsTabletRows admins={admins?.items ?? []} />
          <AdminsDesktopTable admins={admins?.items ?? []} />
        </Panel>

        <Panel title="Pending invitations">
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
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
