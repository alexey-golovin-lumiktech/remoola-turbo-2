import { type DocumentCasePageData } from './page.loader';

export type DocumentCasePagePermissions = {
  canManage: boolean;
  currentAdminId: string | null;
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function deriveDocumentCasePagePermissions(
  identity: DocumentCasePageData[`identity`],
  documentCase: DocumentCasePageData[`documentCase`],
): DocumentCasePagePermissions {
  const canManage = identity?.capabilities.includes(`documents.manage`) ?? false;

  const currentAssignment = documentCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);

  return {
    canManage,
    currentAdminId,
    ownsAssignment,
    canManageAssignments,
    canClaim,
    canRelease,
    canReassign,
  };
}
