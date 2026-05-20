'use server';

import { postAdminMutation } from './core.server';
import { buildAssignmentClaimBody, buildAssignmentReassignBody, buildAssignmentReleaseBody } from './form-helpers';
import { revalidateLedgerEntryAssignmentPaths } from './revalidation';

export async function claimLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  if (!ledgerEntryId) {
    throw new Error(`ledgerEntryId is required`);
  }
  const body = buildAssignmentClaimBody(`ledger_entry`, ledgerEntryId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim ledger entry assignment`);
  revalidateLedgerEntryAssignmentPaths(ledgerEntryId);
}

export async function releaseLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  if (!ledgerEntryId) {
    throw new Error(`ledgerEntryId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(`/admin-v2/assignments/release`, body, `Failed to release ledger entry assignment`);
  revalidateLedgerEntryAssignmentPaths(ledgerEntryId);
}

export async function reassignLedgerEntryAssignmentAction(ledgerEntryId: string, formData: FormData): Promise<void> {
  if (!ledgerEntryId) {
    throw new Error(`ledgerEntryId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(`/admin-v2/assignments/reassign`, body, `Failed to reassign ledger entry assignment`);
  revalidateLedgerEntryAssignmentPaths(ledgerEntryId);
}
