'use server';

import { adminV2EscalatePayoutBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parseOptionalConsumerId, parseRequiredVersion } from './form-helpers';
import { revalidatePayoutPaths, revalidatePayoutAssignmentPaths } from './revalidation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

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
  return runAssignmentClaim({
    resourceType: `payout`,
    resourceId: payoutId,
    idLabel: `payoutId`,
    errorMessage: `Failed to claim payout assignment`,
    formData,
    revalidate: () => revalidatePayoutAssignmentPaths(payoutId),
  });
}

export async function releasePayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  return runAssignmentRelease({
    resourceId: payoutId,
    idLabel: `payoutId`,
    errorMessage: `Failed to release payout assignment`,
    formData,
    revalidate: () => revalidatePayoutAssignmentPaths(payoutId),
  });
}

export async function reassignPayoutAssignmentAction(payoutId: string, formData: FormData): Promise<void> {
  return runAssignmentReassign({
    resourceId: payoutId,
    idLabel: `payoutId`,
    errorMessage: `Failed to reassign payout assignment`,
    formData,
    revalidate: () => revalidatePayoutAssignmentPaths(payoutId),
  });
}
