'use server';

import { revalidateLedgerEntryAssignmentPaths } from './revalidation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

export async function claimLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  return runAssignmentClaim({
    resourceType: `ledger_entry`,
    resourceId: ledgerEntryId,
    idLabel: `ledgerEntryId`,
    errorMessage: `Failed to claim ledger entry assignment`,
    formData,
    revalidate: () => revalidateLedgerEntryAssignmentPaths(ledgerEntryId),
  });
}

export async function releaseLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  return runAssignmentRelease({
    resourceId: ledgerEntryId,
    idLabel: `ledgerEntryId`,
    errorMessage: `Failed to release ledger entry assignment`,
    formData,
    revalidate: () => revalidateLedgerEntryAssignmentPaths(ledgerEntryId),
  });
}

export async function reassignLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  return runAssignmentReassign({
    resourceId: ledgerEntryId,
    idLabel: `ledgerEntryId`,
    errorMessage: `Failed to reassign ledger entry assignment`,
    formData,
    revalidate: () => revalidateLedgerEntryAssignmentPaths(ledgerEntryId),
  });
}
