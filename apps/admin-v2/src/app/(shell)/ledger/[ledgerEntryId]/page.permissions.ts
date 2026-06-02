import { type LedgerEntryCasePageData } from './page.loader';
import {
  deriveAssignmentPermissions,
  type AssignmentPermissions,
} from '../../../../lib/admin-permissions/assignment-permissions';

export type LedgerEntryCasePagePermissions = AssignmentPermissions;

export function deriveLedgerEntryCasePagePermissions(
  identity: LedgerEntryCasePageData[`identity`],
  ledgerCase: LedgerEntryCasePageData[`ledgerCase`],
): LedgerEntryCasePagePermissions {
  return deriveAssignmentPermissions(identity, ledgerCase.assignment);
}
