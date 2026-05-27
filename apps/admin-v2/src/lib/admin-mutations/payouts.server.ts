'use server';

import { adminV2EscalatePayoutBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import {
  buildAssignmentClaimBody,
  buildAssignmentReassignBody,
  buildAssignmentReleaseBody,
  parseOptionalConsumerId,
  parseRequiredVersion,
} from './form-helpers';
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
  const body = buildAssignmentClaimBody(`payout`, payoutId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim payout assignment`);
  revalidatePayoutAssignmentPaths(payoutId);
}

export async function releasePayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  if (!payoutId) {
    throw new Error(`payoutId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(`/admin-v2/assignments/release`, body, `Failed to release payout assignment`);
  revalidatePayoutAssignmentPaths(payoutId);
}

export async function reassignPayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  if (!payoutId) {
    throw new Error(`payoutId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(`/admin-v2/assignments/reassign`, body, `Failed to reassign payout assignment`);
  revalidatePayoutAssignmentPaths(payoutId);
}
