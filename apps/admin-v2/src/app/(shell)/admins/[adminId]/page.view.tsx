import { type AdminCasePageData } from './page.loader';
import { type AdminCasePagePermissions } from './page.permissions';
import { AdminAccessProfileGrid } from './sections/AdminAccessProfileGrid';
import { AdminAuditGrid } from './sections/AdminAuditGrid';
import { AdminContextRail } from './sections/AdminContextRail';
import { AdminHeaderPanel } from './sections/AdminHeaderPanel';
import { AdminManagementActions } from './sections/AdminManagementActions';
import { AdminSessionsSection } from './sections/AdminSessionsSection';
import { AdminSummaryGrid } from './sections/AdminSummaryGrid';
import { WorkspaceLayout } from '../../../../components/workspace-layout';

export function AdminCasePageView({
  data,
  permissions,
}: {
  data: AdminCasePageData;
  permissions: AdminCasePagePermissions;
}) {
  const { admin, sessionResult, sessions, backToQueueHref } = data;
  const { canManage, canReadSessions, isSelf } = permissions;

  return (
    <WorkspaceLayout
      workspace="admin-case"
      context={<AdminContextRail admin={admin} sessions={sessions} backToQueueHref={backToQueueHref} />}
      contextTitle="Admin snapshot"
      contextDescription="Lifecycle, access posture, and audit shortcuts for the current admin record."
    >
      <>
        <AdminHeaderPanel admin={admin} backToQueueHref={backToQueueHref} />
        <AdminSummaryGrid admin={admin} />
        <AdminAccessProfileGrid admin={admin} />
        {canManage ? <AdminManagementActions admin={admin} isSelf={isSelf} /> : null}
        <AdminAuditGrid admin={admin} />
        {canReadSessions ? (
          <AdminSessionsSection
            admin={admin}
            sessionResult={sessionResult}
            sessions={sessions}
            canManage={canManage}
            isSelf={isSelf}
          />
        ) : null}
      </>
    </WorkspaceLayout>
  );
}
