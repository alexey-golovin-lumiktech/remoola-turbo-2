import { type DocumentCasePageData } from './page.loader';
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
  const canManage = identity?.capabilities.includes(`documents.manage`) ?? false;
  return {
    canManage,
    ...deriveAssignmentPermissions(identity, documentCase.assignment),
  };
}
