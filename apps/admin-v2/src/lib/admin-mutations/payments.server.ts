'use server';

import { adminV2PaymentReversalBodySchema } from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import {
  parsePasswordConfirmation,
  buildAssignmentClaimBody,
  buildAssignmentReleaseBody,
  buildAssignmentReassignBody,
} from './form-helpers';
import { revalidatePaymentPaths, revalidatePaymentRequestAssignmentPaths } from './revalidation';

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
  if (!paymentRequestId) {
    throw new Error(`paymentRequestId is required`);
  }
  const body = buildAssignmentClaimBody(`payment_request`, paymentRequestId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim payment request assignment`);
  revalidatePaymentRequestAssignmentPaths(paymentRequestId);
}

export async function releasePaymentRequestAssignmentAction(
  paymentRequestId: string,
  formData: FormData,
): Promise<void> {
  if (!paymentRequestId) {
    throw new Error(`paymentRequestId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(`/admin-v2/assignments/release`, body, `Failed to release payment request assignment`);
  revalidatePaymentRequestAssignmentPaths(paymentRequestId);
}

export async function reassignPaymentRequestAssignmentAction(
  paymentRequestId: string,
  formData: FormData,
): Promise<void> {
  if (!paymentRequestId) {
    throw new Error(`paymentRequestId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(`/admin-v2/assignments/reassign`, body, `Failed to reassign payment request assignment`);
  revalidatePaymentRequestAssignmentPaths(paymentRequestId);
}
