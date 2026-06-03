'use server';

import { adminV2PaymentReversalBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parsePasswordConfirmation } from './form-helpers';
import { revalidatePaymentPaths, revalidatePaymentRequestAssignmentPaths } from './revalidation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

export async function refundPaymentAction(
  paymentRequestId: string,
  payerId: string | null,
  requesterId: string | null,
  formData: FormData,
): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  if (!confirmed) {
    throw new Error(`Confirmation is required to issue a refund`);
  }
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const rawAmount = String(formData.get(`amount`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2PaymentReversalBodySchema.parse({
    amount: rawAmount ? Number(rawAmount) : undefined,
    reason: reason || undefined,
    passwordConfirmation,
  });
  await postAdminMutation(`/admin-v2/payments/${paymentRequestId}/refund`, body, `Failed to create refund`);
  revalidatePaymentPaths(paymentRequestId, [payerId, requesterId]);
}

export async function chargebackPaymentAction(
  paymentRequestId: string,
  payerId: string | null,
  requesterId: string | null,
  formData: FormData,
): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  if (!confirmed) {
    throw new Error(`Confirmation is required to record a chargeback`);
  }
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const rawAmount = String(formData.get(`amount`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2PaymentReversalBodySchema.parse({
    amount: rawAmount ? Number(rawAmount) : undefined,
    reason: reason || undefined,
    passwordConfirmation,
  });
  await postAdminMutation(`/admin-v2/payments/${paymentRequestId}/chargeback`, body, `Failed to create chargeback`);
  revalidatePaymentPaths(paymentRequestId, [payerId, requesterId]);
}

export async function claimPaymentRequestAssignmentAction(paymentRequestId: string, formData: FormData): Promise<void> {
  return runAssignmentClaim({
    resourceType: `payment_request`,
    resourceId: paymentRequestId,
    idLabel: `paymentRequestId`,
    errorMessage: `Failed to claim payment request assignment`,
    formData,
    revalidate: () => revalidatePaymentRequestAssignmentPaths(paymentRequestId),
  });
}

export async function releasePaymentRequestAssignmentAction(
  paymentRequestId: string,
  formData: FormData,
): Promise<void> {
  return runAssignmentRelease({
    resourceId: paymentRequestId,
    idLabel: `paymentRequestId`,
    errorMessage: `Failed to release payment request assignment`,
    formData,
    revalidate: () => revalidatePaymentRequestAssignmentPaths(paymentRequestId),
  });
}

export async function reassignPaymentRequestAssignmentAction(
  paymentRequestId: string,
  formData: FormData,
): Promise<void> {
  return runAssignmentReassign({
    resourceId: paymentRequestId,
    idLabel: `paymentRequestId`,
    errorMessage: `Failed to reassign payment request assignment`,
    formData,
    revalidate: () => revalidatePaymentRequestAssignmentPaths(paymentRequestId),
  });
}
