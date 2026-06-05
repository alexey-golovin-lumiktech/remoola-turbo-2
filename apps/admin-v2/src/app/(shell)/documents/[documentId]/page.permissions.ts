import { type DocumentCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';
import {
  deriveAssignmentPermissions,
  type AssignmentPermissions,
} from '../../../../lib/admin-permissions/assignment-permissions';

export type DocumentCasePagePermissions = AssignmentPermissions & {
  canManage: boolean;
};

export function deriveDocumentCasePagePermissions(
  identity: DocumentCasePageData[`identity`],
  documentCase: DocumentCasePageData[`documentCase`],
): DocumentCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.documentsManage);
  return {
    canManage,
    ...deriveAssignmentPermissions(identity, documentCase.assignment),
  };
}
