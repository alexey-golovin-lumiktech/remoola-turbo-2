'use server';

import { adminV2VerificationDecisionBodySchema } from '@remoola/api-types';

import { postAdminMutation } from './core.server';
import { parseRequiredVersion } from './form-helpers';
import { revalidateVerificationAssignmentPaths, revalidateVerificationDecisionPaths } from './revalidation';
import { parseConfirmedFormValue } from '../admin-confirmation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

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
  return runAssignmentClaim({
    resourceType: `verification`,
    resourceId: consumerId,
    idLabel: `consumerId`,
    errorMessage: `Failed to claim verification assignment`,
    formData,
    revalidate: () => revalidateVerificationAssignmentPaths(consumerId),
  });
}

export async function releaseVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  return runAssignmentRelease({
    resourceId: consumerId,
    idLabel: `consumerId`,
    errorMessage: `Failed to release verification assignment`,
    formData,
    revalidate: () => revalidateVerificationAssignmentPaths(consumerId),
  });
}

export async function reassignVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  return runAssignmentReassign({
    resourceId: consumerId,
    idLabel: `consumerId`,
    errorMessage: `Failed to reassign verification`,
    formData,
    revalidate: () => revalidateVerificationAssignmentPaths(consumerId),
  });
}
