'use server';

import { adminV2VerificationDecisionBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import {
  buildAssignmentClaimBody,
  buildAssignmentReleaseBody,
  buildAssignmentReassignBody,
  parseRequiredVersion,
} from './form-helpers';
import { revalidateVerificationAssignmentPaths, revalidateVerificationDecisionPaths } from './revalidation';

async function applyVerificationDecision(
  consumerId: string,
  decisionPath: string,
  formData: FormData,
  fallbackMessage: string,
): Promise<void> {
  const version = parseRequiredVersion(formData);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2VerificationDecisionBodySchema.parse({
    version,
    reason: reason || undefined,
    confirmed,
  });
  await postAdminMutation(`/admin-v2/verification/${consumerId}/${decisionPath}`, body, fallbackMessage);
  revalidateVerificationDecisionPaths(consumerId);
}

export async function approveVerificationAction(consumerId: string, formData: FormData): Promise<void> {
  await applyVerificationDecision(consumerId, `approve`, formData, `Failed to approve verification`);
}

export async function rejectVerificationAction(consumerId: string, formData: FormData): Promise<void> {
  await applyVerificationDecision(consumerId, `reject`, formData, `Failed to reject verification`);
}

export async function requestInfoVerificationAction(consumerId: string, formData: FormData): Promise<void> {
  await applyVerificationDecision(consumerId, `request-info`, formData, `Failed to request more information`);
}

export async function flagVerificationAction(consumerId: string, formData: FormData): Promise<void> {
  await applyVerificationDecision(consumerId, `flag`, formData, `Failed to flag verification`);
}

export async function claimVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
  }
  const body = buildAssignmentClaimBody(`verification`, consumerId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim verification assignment`);
  revalidateVerificationAssignmentPaths(consumerId);
}

export async function releaseVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(`/admin-v2/assignments/release`, body, `Failed to release verification assignment`);
  revalidateVerificationAssignmentPaths(consumerId);
}

export async function reassignVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(`/admin-v2/assignments/reassign`, body, `Failed to reassign verification`);
  revalidateVerificationAssignmentPaths(consumerId);
}
