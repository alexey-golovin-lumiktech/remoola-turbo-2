'use server';

import { adminV2EscalatePayoutBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parseRequiredVersion, parseOptionalConsumerId } from './form-helpers';
import { revalidatePayoutPaths, revalidatePayoutAssignmentPaths } from './revalidation';

export async function escalatePayoutAction(payoutId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2EscalatePayoutBodySchema.parse({
    version,
    confirmed,
    reason: reason || undefined,
  });
  await postAdminMutation(`/admin-v2/payouts/${payoutId}/escalate`, body, `Failed to escalate payout`);
  revalidatePayoutPaths(payoutId, consumerId);
}

export async function claimPayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  if (!payoutId) {
    throw new Error(`payoutId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/claim`,
    { resourceType: `payout`, resourceId: payoutId, reason: reason || null },
    `Failed to claim payout assignment`,
  );
  revalidatePayoutAssignmentPaths(payoutId);
}

export async function releasePayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  if (!payoutId) {
    throw new Error(`payoutId is required`);
  }
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  if (!assignmentId) {
    throw new Error(`assignmentId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/release`,
    { assignmentId, reason: reason || null, expectedReleasedAtNull: 0 },
    `Failed to release payout assignment`,
  );
  revalidatePayoutAssignmentPaths(payoutId);
}

export async function reassignPayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  if (!payoutId) {
    throw new Error(`payoutId is required`);
  }
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  const newAssigneeId = String(formData.get(`newAssigneeId`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  if (!assignmentId) {
    throw new Error(`assignmentId is required`);
  }
  if (!newAssigneeId) {
    throw new Error(`newAssigneeId is required`);
  }
  await postAdminMutation(
    `/admin-v2/assignments/reassign`,
    { assignmentId, newAssigneeId, reason, confirmed, expectedReleasedAtNull: 0 },
    `Failed to reassign payout assignment`,
  );
  revalidatePayoutAssignmentPaths(payoutId);
}
