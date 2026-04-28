'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import {
  adminV2ApproveRateBodySchema,
  adminV2AssignmentClaimBodySchema,
  adminV2AssignmentReassignBodySchema,
  adminV2AssignmentReleaseBodySchema,
  adminV2ChangeAdminPermissionsBodySchema,
  adminV2ChangeAdminRoleBodySchema,
  adminV2DeactivateAdminBodySchema,
  adminV2DisablePaymentMethodBodySchema,
  adminV2EscalatePayoutBodySchema,
  adminV2ForceLogoutConsumerBodySchema,
  adminV2InviteAdminBodySchema,
  adminV2OperationalAlertCreateBodySchema,
  adminV2OperationalAlertDeleteBodySchema,
  adminV2OperationalAlertUpdateBodySchema,
  adminV2RemoveDefaultPaymentMethodBodySchema,
  adminV2ResendConsumerEmailBodySchema,
  adminV2SavedViewCreateBodySchema,
  adminV2SavedViewDeleteBodySchema,
  adminV2SavedViewUpdateBodySchema,
  adminV2SuspendConsumerBodySchema,
  adminV2VerificationDecisionBodySchema,
  adminV2VersionedMutationBodySchema,
} from '@remoola/api-types';

import { buildAdminMutationHeaders } from './admin-auth-headers.server';
import { parseConfirmedFormValue } from './admin-confirmation';
import { ADMIN_V2_PERMISSION_OVERRIDE_OPTIONS } from './admin-rbac';
import { SAVED_VIEW_WORKSPACE_PATHS } from './admin-surface-meta';
import { getEnv } from './env.server';

type MutationError = {
  code: string;
  message: string;
};

async function parseError(response: Response, fallbackMessage: string): Promise<MutationError> {
  const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
  return {
    code: payload?.code ?? `API_ERROR`,
    message: payload?.message ?? fallbackMessage,
  };
}

async function requireBaseUrl(): Promise<string> {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error(`API base URL is not configured`);
  }
  return env.NEXT_PUBLIC_API_BASE_URL;
}

async function sendAdminMutation(
  method: `POST` | `PATCH` | `DELETE`,
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<void> {
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: buildAdminMutationHeaders(cookieStore.toString(), {
      'content-type': `application/json`,
      'x-correlation-id': randomUUID(),
      'Idempotency-Key': randomUUID(),
    }),
    body: JSON.stringify(body),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, fallbackMessage);
    throw new Error(error.message);
  }
}

async function postAdminMutation(path: string, body: unknown, fallbackMessage: string): Promise<void> {
  await sendAdminMutation(`POST`, path, body, fallbackMessage);
}

async function patchAdminMutation(path: string, body: unknown, fallbackMessage: string): Promise<void> {
  await sendAdminMutation(`PATCH`, path, body, fallbackMessage);
}

async function deleteAdminMutation(path: string, body: unknown, fallbackMessage: string): Promise<void> {
  await sendAdminMutation(`DELETE`, path, body, fallbackMessage);
}

export async function createConsumerNoteAction(consumerId: string, formData: FormData): Promise<void> {
  const content = String(formData.get(`content`) ?? ``).trim();
  if (!content) {
    return;
  }
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/notes`, { content }, `Failed to create note`);

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}

export async function addConsumerFlagAction(consumerId: string, formData: FormData): Promise<void> {
  const flag = String(formData.get(`flag`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  if (!flag) {
    return;
  }
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/flags`,
    { flag, reason: reason || null },
    `Failed to add flag`,
  );

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}

export async function removeConsumerFlagAction(consumerId: string, flagId: string, formData: FormData): Promise<void> {
  const version = Number(formData.get(`version`) ?? 0);
  await patchAdminMutation(
    `/admin-v2/consumers/${consumerId}/flags/${flagId}/remove`,
    { version },
    `Failed to remove flag`,
  );

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}

export async function forceLogoutConsumerAction(consumerId: string, formData: FormData): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2ForceLogoutConsumerBodySchema.parse({ confirmed });
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/force-logout`,
    body,
    `Failed to force logout consumer sessions`,
  );
  revalidatePath(`/consumers/${consumerId}`);
  revalidatePath(`/verification/${consumerId}`);
}

export async function suspendConsumerAction(consumerId: string, formData: FormData): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2SuspendConsumerBodySchema.parse({ confirmed, reason });
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/suspend`, body, `Failed to suspend consumer`);
  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
  revalidatePath(`/verification/${consumerId}`);
}

export async function resendConsumerEmailAction(consumerId: string, formData: FormData): Promise<void> {
  const emailKind = String(formData.get(`emailKind`) ?? ``).trim();
  const appScope = String(formData.get(`appScope`) ?? ``).trim();
  const body = adminV2ResendConsumerEmailBodySchema.parse({ emailKind, appScope });
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/email-resend`, body, `Failed to resend consumer email`);
  revalidatePath(`/consumers/${consumerId}`);
}

function parseRequiredVersion(formData: FormData): number {
  const version = Number(formData.get(`version`) ?? 0);
  if (!Number.isFinite(version) || version < 1) {
    throw new Error(`Valid version is required`);
  }
  return version;
}

function parseOptionalConsumerId(formData: FormData): string | null {
  const consumerId = String(formData.get(`consumerId`) ?? ``).trim();
  return consumerId || null;
}

function revalidatePaymentMethodPaths(paymentMethodId: string, consumerId: string | null) {
  revalidatePath(`/payment-methods`);
  revalidatePath(`/payment-methods/${paymentMethodId}`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

function revalidatePayoutPaths(payoutId: string, consumerId: string | null) {
  revalidatePath(`/payouts`);
  revalidatePath(`/payouts/${payoutId}`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

function revalidateExchangeRatePaths(rateId: string) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/rates`);
  revalidatePath(`/exchange/rates/${rateId}`);
  revalidatePath(`/overview`);
}

function revalidateExchangeRulePaths(ruleId: string, consumerId: string | null) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/rules`);
  revalidatePath(`/exchange/rules/${ruleId}`);
  revalidatePath(`/overview`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

function revalidateExchangeScheduledPaths(conversionId: string, consumerId: string | null) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/scheduled`);
  revalidatePath(`/exchange/scheduled/${conversionId}`);
  revalidatePath(`/overview`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

function revalidateDocumentsPaths(documentId?: string | null) {
  revalidatePath(`/documents`);
  revalidatePath(`/documents/tags`);
  if (documentId?.trim()) {
    revalidatePath(`/documents/${documentId.trim()}`);
  }
}

function parseStringList(formData: FormData, fieldName: string): string[] {
  return formData
    .getAll(fieldName)
    .map((value) => String(value ?? ``).trim())
    .filter(Boolean);
}

export async function disablePaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2DisablePaymentMethodBodySchema.parse({ version, confirmed, reason });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/disable`,
    body,
    `Failed to disable payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function removeDefaultPaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2RemoveDefaultPaymentMethodBodySchema.parse({ version });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/remove-default`,
    body,
    `Failed to remove payment method default`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function escalateDuplicatePaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/duplicate-escalate`,
    body,
    `Failed to escalate duplicate payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

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

export async function approveExchangeRateAction(rateId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2ApproveRateBodySchema.parse({ version, confirmed, reason });
  await postAdminMutation(`/admin-v2/exchange/rates/${rateId}/approve`, body, `Failed to approve exchange rate`);
  revalidateExchangeRatePaths(rateId);
}

export async function pauseExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/pause`, body, `Failed to pause exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function resumeExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/resume`, body, `Failed to resume exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function runExchangeRuleNowAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/run-now`, body, `Failed to run exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function forceExecuteScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2ApproveRateBodySchema.pick({ version: true, confirmed: true }).parse({ version, confirmed });
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/force-execute`,
    body,
    `Failed to force execute scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function cancelScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2ApproveRateBodySchema.pick({ version: true, confirmed: true }).parse({ version, confirmed });
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/cancel`,
    body,
    `Failed to cancel scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function createDocumentTagAction(formData: FormData): Promise<void> {
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    return;
  }
  await postAdminMutation(`/admin-v2/documents/tags`, { name }, `Failed to create document tag`);
  revalidateDocumentsPaths();
}

export async function updateDocumentTagAction(tagId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`Tag name is required`);
  }
  await patchAdminMutation(`/admin-v2/documents/tags/${tagId}`, { version, name }, `Failed to update document tag`);
  revalidateDocumentsPaths();
}

export async function deleteDocumentTagAction(tagId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  await deleteAdminMutation(
    `/admin-v2/documents/tags/${tagId}`,
    { version, confirmed },
    `Failed to delete document tag`,
  );
  revalidateDocumentsPaths();
}

export async function retagDocumentAction(documentId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const tagIds = parseStringList(formData, `tagIds`);
  await postAdminMutation(`/admin-v2/documents/${documentId}/retag`, { version, tagIds }, `Failed to retag document`);
  revalidateDocumentsPaths(documentId);
}

export async function bulkTagDocumentsAction(formData: FormData): Promise<void> {
  const tagIds = parseStringList(formData, `tagIds`);
  const resources = parseStringList(formData, `resourceVersion`).map((entry) => {
    const [resourceId, versionRaw] = entry.split(`:`);
    const version = Number(versionRaw ?? 0);
    if (!resourceId?.trim() || !Number.isFinite(version) || version < 1) {
      throw new Error(`Each selected document must include a valid version`);
    }
    return {
      resourceId: resourceId.trim(),
      version,
    };
  });
  await postAdminMutation(
    `/admin-v2/documents/bulk-tag`,
    { tagIds, resources },
    `Failed to bulk tag selected documents`,
  );
  revalidateDocumentsPaths();
}

async function applyVerificationDecision(
  consumerId: string,
  decisionPath: string,
  formData: FormData,
  fallbackMessage: string,
): Promise<void> {
  const version = Number(formData.get(`version`) ?? 0);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2VerificationDecisionBodySchema.parse({
    version,
    reason: reason || undefined,
    confirmed,
  });
  await postAdminMutation(`/admin-v2/verification/${consumerId}/${decisionPath}`, body, fallbackMessage);
  revalidatePath(`/overview`);
  revalidatePath(`/verification`);
  revalidatePath(`/verification/${consumerId}`);
  revalidatePath(`/consumers/${consumerId}`);
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

function revalidateAdminPaths(adminId?: string | null) {
  revalidatePath(`/admins`);
  if (adminId?.trim()) {
    revalidatePath(`/admins/${adminId.trim()}`);
  }
}

function buildAdminCapabilityOverrides(formData: FormData) {
  return ADMIN_V2_PERMISSION_OVERRIDE_OPTIONS.map(({ capability }) => ({
    capability,
    mode: String(formData.get(`capability_override_${capability}`) ?? `inherit`),
  }));
}

export async function inviteAdminAction(formData: FormData): Promise<void> {
  const email = String(formData.get(`email`) ?? ``).trim();
  const roleKey = String(formData.get(`roleKey`) ?? ``).trim();
  const body = adminV2InviteAdminBodySchema.parse({ email, roleKey });
  await postAdminMutation(`/admin-v2/admins/invite`, body, `Failed to invite admin`);
  revalidateAdminPaths();
}

export async function deactivateAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2DeactivateAdminBodySchema.parse({ version, confirmed, reason: reason || undefined });
  await postAdminMutation(`/admin-v2/admins/${adminId}/deactivate`, body, `Failed to deactivate admin`);
  revalidateAdminPaths(adminId);
}

export async function restoreAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const body = adminV2VersionedMutationBodySchema.parse({ version });
  await postAdminMutation(`/admin-v2/admins/${adminId}/restore`, body, `Failed to restore admin`);
  revalidateAdminPaths(adminId);
}

export async function changeAdminRoleAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const roleKey = String(formData.get(`roleKey`) ?? ``).trim();
  const body = adminV2ChangeAdminRoleBodySchema.parse({ version, confirmed, roleKey });
  await postAdminMutation(`/admin-v2/admins/${adminId}/role-change`, body, `Failed to change admin role`);
  revalidateAdminPaths(adminId);
}

export async function changeAdminPermissionsAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const body = adminV2ChangeAdminPermissionsBodySchema.parse({
    version,
    capabilityOverrides: buildAdminCapabilityOverrides(formData),
  });
  await postAdminMutation(`/admin-v2/admins/${adminId}/permissions-change`, body, `Failed to change admin permissions`);
  revalidateAdminPaths(adminId);
}

function revalidateVerificationAssignmentPaths(consumerId: string) {
  revalidatePath(`/verification`);
  revalidatePath(`/verification/${consumerId}`);
}

function buildAssignmentClaimBody(resourceType: string, resourceId: string, formData: FormData) {
  const reason = String(formData.get(`reason`) ?? ``).trim();
  return adminV2AssignmentClaimBodySchema.parse({
    resourceType,
    resourceId,
    reason: reason || undefined,
  });
}

function buildAssignmentReleaseBody(formData: FormData) {
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  return adminV2AssignmentReleaseBodySchema.parse({
    assignmentId,
    reason: reason || undefined,
    expectedReleasedAtNull: 0,
  });
}

function buildAssignmentReassignBody(formData: FormData) {
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  const newAssigneeId = String(formData.get(`newAssigneeId`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  return adminV2AssignmentReassignBodySchema.parse({
    assignmentId,
    newAssigneeId,
    reason,
    confirmed,
    expectedReleasedAtNull: 0,
  });
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

function revalidateLedgerEntryAssignmentPaths(ledgerEntryId: string) {
  revalidatePath(`/ledger`);
  revalidatePath(`/ledger/anomalies`);
  revalidatePath(`/ledger/${ledgerEntryId}`);
}

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

function revalidatePaymentRequestAssignmentPaths(paymentRequestId: string) {
  revalidatePath(`/payments`);
  revalidatePath(`/payments/operations`);
  revalidatePath(`/payments/${paymentRequestId}`);
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

function revalidatePayoutAssignmentPaths(payoutId: string) {
  revalidatePath(`/payouts`);
  revalidatePath(`/payouts/${payoutId}`);
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

function revalidateDocumentAssignmentPaths(documentId: string) {
  revalidatePath(`/documents`);
  revalidatePath(`/documents/${documentId}`);
}

export async function claimDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  if (!documentId) {
    throw new Error(`documentId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/claim`,
    { resourceType: `document`, resourceId: documentId, reason: reason || null },
    `Failed to claim document assignment`,
  );
  revalidateDocumentAssignmentPaths(documentId);
}

export async function releaseDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  if (!documentId) {
    throw new Error(`documentId is required`);
  }
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  if (!assignmentId) {
    throw new Error(`assignmentId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/release`,
    { assignmentId, reason: reason || null, expectedReleasedAtNull: 0 },
    `Failed to release document assignment`,
  );
  revalidateDocumentAssignmentPaths(documentId);
}

export async function reassignDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  if (!documentId) {
    throw new Error(`documentId is required`);
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
    `Failed to reassign document assignment`,
  );
  revalidateDocumentAssignmentPaths(documentId);
}

function revalidateFxConversionAssignmentPaths(conversionId: string) {
  revalidatePath(`/exchange/scheduled`);
  revalidatePath(`/exchange/scheduled/${conversionId}`);
}

export async function claimFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentClaimBody(`fx_conversion`, conversionId, formData);
  await postAdminMutation(`/admin-v2/assignments/claim`, body, `Failed to claim scheduled FX conversion assignment`);
  revalidateFxConversionAssignmentPaths(conversionId);
}

export async function releaseFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentReleaseBody(formData);
  await postAdminMutation(
    `/admin-v2/assignments/release`,
    body,
    `Failed to release scheduled FX conversion assignment`,
  );
  revalidateFxConversionAssignmentPaths(conversionId);
}

export async function reassignFxConversionAssignmentAction(conversionId: string, formData: FormData): Promise<void> {
  if (!conversionId) {
    throw new Error(`conversionId is required`);
  }
  const body = buildAssignmentReassignBody(formData);
  await postAdminMutation(
    `/admin-v2/assignments/reassign`,
    body,
    `Failed to reassign scheduled FX conversion assignment`,
  );
  revalidateFxConversionAssignmentPaths(conversionId);
}

export async function resetAdminPasswordAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  await postAdminMutation(
    `/admin-v2/admins/${adminId}/password-reset`,
    { version },
    `Failed to send admin password reset`,
  );
  revalidateAdminPaths(adminId);
}

export async function revokeMyAdminSessionAction(formData: FormData): Promise<void> {
  const sessionId = String(formData.get(`sessionId`) ?? ``).trim();
  if (!sessionId) {
    throw new Error(`sessionId is required`);
  }
  await postAdminMutation(`/admin-v2/auth/revoke-session`, { sessionId }, `Failed to revoke own session`);
  revalidatePath(`/me/sessions`);
}

export async function revokeAdminSessionAction(adminId: string, sessionId: string, formData: FormData): Promise<void> {
  void formData;
  await postAdminMutation(
    `/admin-v2/admins/${adminId}/sessions/${sessionId}/revoke`,
    {},
    `Failed to revoke admin session`,
  );
  revalidateAdminPaths(adminId);
}

function revalidateSavedViewWorkspace(workspace: string) {
  const path = SAVED_VIEW_WORKSPACE_PATHS[workspace as keyof typeof SAVED_VIEW_WORKSPACE_PATHS];
  if (path) {
    revalidatePath(path);
  }
}

function parseSavedViewPayload(raw: string | null): unknown {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`Saved view payload is not valid JSON`);
  }
}

export async function createSavedViewAction(formData: FormData): Promise<void> {
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  if (!workspace) {
    throw new Error(`workspace is required`);
  }
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`name is required`);
  }
  const description = String(formData.get(`description`) ?? ``).trim();
  const queryPayload = parseSavedViewPayload(String(formData.get(`queryPayload`) ?? ``));
  const body = adminV2SavedViewCreateBodySchema.parse({
    workspace,
    name,
    description: description || null,
    queryPayload,
  });

  await postAdminMutation(`/admin-v2/saved-views`, body, `Failed to create saved view`);
  revalidateSavedViewWorkspace(workspace);
}

export async function updateSavedViewAction(savedViewId: string, formData: FormData): Promise<void> {
  if (!savedViewId) {
    throw new Error(`savedViewId is required`);
  }
  const body: {
    expectedDeletedAtNull: number;
    name?: string;
    description?: string | null;
    queryPayload?: unknown;
  } = { expectedDeletedAtNull: 0 };

  const rawName = formData.get(`name`);
  if (rawName !== null) {
    const name = String(rawName).trim();
    if (!name) {
      throw new Error(`name cannot be empty`);
    }
    body.name = name;
  }
  const rawDescription = formData.get(`description`);
  if (rawDescription !== null) {
    const description = String(rawDescription).trim();
    body.description = description || null;
  }
  const rawPayload = formData.get(`queryPayload`);
  if (rawPayload !== null) {
    body.queryPayload = parseSavedViewPayload(String(rawPayload));
  }

  const parsedBody = adminV2SavedViewUpdateBodySchema.parse(body);
  await patchAdminMutation(`/admin-v2/saved-views/${savedViewId}`, parsedBody, `Failed to update saved view`);
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  revalidateSavedViewWorkspace(workspace || `ledger_anomalies`);
}

export async function deleteSavedViewAction(savedViewId: string, formData: FormData): Promise<void> {
  if (!savedViewId) {
    throw new Error(`savedViewId is required`);
  }
  await deleteAdminMutation(
    `/admin-v2/saved-views/${savedViewId}`,
    adminV2SavedViewDeleteBodySchema.parse({ expectedDeletedAtNull: 0 }),
    `Failed to delete saved view`,
  );
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  revalidateSavedViewWorkspace(workspace || `ledger_anomalies`);
}

const OPERATIONAL_ALERTS_PATH = `/system/alerts`;

function revalidateOperationalAlerts() {
  revalidatePath(OPERATIONAL_ALERTS_PATH);
}

function parseOperationalAlertJsonField(raw: string | null, label: string): unknown {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function parsePositiveIntegerField(raw: string | null, label: string): number | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
}

function parseCheckboxField(raw: FormDataEntryValue | null): boolean | undefined {
  if (raw == null) return undefined;
  const value = String(raw).trim().toLowerCase();
  if (!value) return undefined;
  if (value === `true` || value === `on` || value === `1`) return true;
  if (value === `false` || value === `0`) return false;
  throw new Error(`checkbox field must be boolean-like`);
}

function parseTrimmedField(raw: FormDataEntryValue | null): string | undefined {
  if (raw == null) return undefined;
  const value = String(raw).trim();
  return value || undefined;
}

function buildOperationalAlertQueryPayload(workspace: string, formData: FormData): unknown {
  const rawQueryPayload = formData.get(`queryPayload`);
  if (rawQueryPayload !== null) {
    return parseOperationalAlertJsonField(String(rawQueryPayload), `queryPayload`);
  }

  if (workspace === `ledger_anomalies`) {
    const anomalyClass = parseTrimmedField(formData.get(`anomalyClass`));
    if (!anomalyClass) {
      throw new Error(`anomalyClass is required`);
    }
    return {
      class: anomalyClass,
      ...(parseTrimmedField(formData.get(`dateFrom`)) ? { dateFrom: parseTrimmedField(formData.get(`dateFrom`)) } : {}),
      ...(parseTrimmedField(formData.get(`dateTo`)) ? { dateTo: parseTrimmedField(formData.get(`dateTo`)) } : {}),
    };
  }

  if (workspace === `auth_refresh_reuse`) {
    const windowMinutes = parsePositiveIntegerField(formData.get(`windowMinutes`) as string | null, `windowMinutes`);
    if (windowMinutes === undefined) {
      throw new Error(`windowMinutes is required`);
    }
    return { windowMinutes };
  }

  if (workspace === `verification_queue`) {
    const missingProfileData = parseCheckboxField(formData.get(`missingProfileData`));
    const missingDocuments = parseCheckboxField(formData.get(`missingDocuments`));
    return {
      ...(parseTrimmedField(formData.get(`status`)) ? { status: parseTrimmedField(formData.get(`status`)) } : {}),
      ...(parseTrimmedField(formData.get(`stripeIdentityStatus`))
        ? { stripeIdentityStatus: parseTrimmedField(formData.get(`stripeIdentityStatus`)) }
        : {}),
      ...(parseTrimmedField(formData.get(`country`)) ? { country: parseTrimmedField(formData.get(`country`)) } : {}),
      ...(parseTrimmedField(formData.get(`contractorKind`))
        ? { contractorKind: parseTrimmedField(formData.get(`contractorKind`)) }
        : {}),
      ...(missingProfileData ? { missingProfileData: true } : {}),
      ...(missingDocuments ? { missingDocuments: true } : {}),
    };
  }

  throw new Error(`workspace is not supported`);
}

function buildOperationalAlertThresholdPayload(formData: FormData): unknown {
  const rawThresholdPayload = formData.get(`thresholdPayload`);
  if (rawThresholdPayload !== null) {
    return parseOperationalAlertJsonField(String(rawThresholdPayload), `thresholdPayload`);
  }

  const countThreshold = parsePositiveIntegerField(formData.get(`countThreshold`) as string | null, `countThreshold`);
  if (countThreshold === undefined) {
    throw new Error(`countThreshold is required`);
  }
  return { type: `count_gt`, value: countThreshold };
}

export async function createOperationalAlertAction(formData: FormData): Promise<void> {
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  if (!workspace) {
    throw new Error(`workspace is required`);
  }
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`name is required`);
  }
  const description = String(formData.get(`description`) ?? ``).trim();
  const queryPayload = buildOperationalAlertQueryPayload(workspace, formData);
  const thresholdPayload = buildOperationalAlertThresholdPayload(formData);
  const evaluationIntervalMinutes = parsePositiveIntegerField(
    formData.get(`evaluationIntervalMinutes`) as string | null,
    `evaluationIntervalMinutes`,
  );

  const body: Record<string, unknown> = {
    workspace,
    name,
    description: description || null,
    queryPayload,
    thresholdPayload,
  };
  if (evaluationIntervalMinutes !== undefined) {
    body.evaluationIntervalMinutes = evaluationIntervalMinutes;
  }
  const parsedBody = adminV2OperationalAlertCreateBodySchema.parse(body);

  await postAdminMutation(`/admin-v2/operational-alerts`, parsedBody, `Failed to create operational alert`);
  revalidateOperationalAlerts();
}

export async function updateOperationalAlertAction(operationalAlertId: string, formData: FormData): Promise<void> {
  if (!operationalAlertId) {
    throw new Error(`operationalAlertId is required`);
  }
  const body: {
    expectedDeletedAtNull: number;
    name?: string;
    description?: string | null;
    queryPayload?: unknown;
    thresholdPayload?: unknown;
    evaluationIntervalMinutes?: number;
  } = { expectedDeletedAtNull: 0 };

  const rawName = formData.get(`name`);
  if (rawName !== null) {
    const name = String(rawName).trim();
    if (!name) {
      throw new Error(`name cannot be empty`);
    }
    body.name = name;
  }
  const rawDescription = formData.get(`description`);
  if (rawDescription !== null) {
    const description = String(rawDescription).trim();
    body.description = description || null;
  }
  const rawQuery = formData.get(`queryPayload`);
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  if (rawQuery !== null || workspace) {
    body.queryPayload = buildOperationalAlertQueryPayload(workspace, formData);
  }
  const rawThreshold = formData.get(`thresholdPayload`);
  if (rawThreshold !== null || formData.get(`countThreshold`) !== null) {
    body.thresholdPayload = buildOperationalAlertThresholdPayload(formData);
  }
  const interval = parsePositiveIntegerField(
    formData.get(`evaluationIntervalMinutes`) as string | null,
    `evaluationIntervalMinutes`,
  );
  if (interval !== undefined) {
    body.evaluationIntervalMinutes = interval;
  }

  const parsedBody = adminV2OperationalAlertUpdateBodySchema.parse(body);
  await patchAdminMutation(
    `/admin-v2/operational-alerts/${operationalAlertId}`,
    parsedBody,
    `Failed to update operational alert`,
  );
  revalidateOperationalAlerts();
}

export async function deleteOperationalAlertAction(operationalAlertId: string, formData: FormData): Promise<void> {
  if (!operationalAlertId) {
    throw new Error(`operationalAlertId is required`);
  }
  void formData;
  await deleteAdminMutation(
    `/admin-v2/operational-alerts/${operationalAlertId}`,
    adminV2OperationalAlertDeleteBodySchema.parse({ expectedDeletedAtNull: 0 }),
    `Failed to delete operational alert`,
  );
  revalidateOperationalAlerts();
}
