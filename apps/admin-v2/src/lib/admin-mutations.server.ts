'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { buildAdminMutationHeaders } from './admin-auth-headers.server';
import { parseConfirmedFormValue } from './admin-confirmation';
import { ADMIN_V2_PERMISSION_OVERRIDE_OPTIONS } from './admin-rbac';
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
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/force-logout`,
    { confirmed },
    `Failed to force logout consumer sessions`,
  );
  revalidatePath(`/consumers/${consumerId}`);
  revalidatePath(`/verification/${consumerId}`);
}

export async function suspendConsumerAction(consumerId: string, formData: FormData): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/suspend`,
    { confirmed, reason },
    `Failed to suspend consumer`,
  );
  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
  revalidatePath(`/verification/${consumerId}`);
}

export async function resendConsumerEmailAction(consumerId: string, formData: FormData): Promise<void> {
  const emailKind = String(formData.get(`emailKind`) ?? ``).trim();
  const appScope = String(formData.get(`appScope`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/email-resend`,
    { emailKind, appScope },
    `Failed to resend consumer email`,
  );
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
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/disable`,
    { version, confirmed, reason },
    `Failed to disable payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function removeDefaultPaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/remove-default`,
    { version },
    `Failed to remove payment method default`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function escalateDuplicatePaymentMethodAction(paymentMethodId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  await postAdminMutation(
    `/admin-v2/payment-methods/${paymentMethodId}/duplicate-escalate`,
    { version },
    `Failed to escalate duplicate payment method`,
  );
  revalidatePaymentMethodPaths(paymentMethodId, consumerId);
}

export async function escalatePayoutAction(payoutId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/payouts/${payoutId}/escalate`,
    {
      version,
      confirmed,
      reason: reason || null,
    },
    `Failed to escalate payout`,
  );
  revalidatePayoutPaths(payoutId, consumerId);
}

export async function approveExchangeRateAction(rateId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/exchange/rates/${rateId}/approve`,
    {
      version,
      confirmed,
      reason,
    },
    `Failed to approve exchange rate`,
  );
  revalidateExchangeRatePaths(rateId);
}

export async function pauseExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/pause`, { version }, `Failed to pause exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function resumeExchangeRuleAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/resume`, { version }, `Failed to resume exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function runExchangeRuleNowAction(ruleId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  await postAdminMutation(`/admin-v2/exchange/rules/${ruleId}/run-now`, { version }, `Failed to run exchange rule`);
  revalidateExchangeRulePaths(ruleId, consumerId);
}

export async function forceExecuteScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/force-execute`,
    { version, confirmed },
    `Failed to force execute scheduled conversion`,
  );
  revalidateExchangeScheduledPaths(conversionId, consumerId);
}

export async function cancelScheduledExchangeAction(conversionId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const consumerId = parseOptionalConsumerId(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  await postAdminMutation(
    `/admin-v2/exchange/scheduled/${conversionId}/cancel`,
    { version, confirmed },
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
  await postAdminMutation(
    `/admin-v2/verification/${consumerId}/${decisionPath}`,
    { version, reason: reason || null, confirmed },
    fallbackMessage,
  );
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
  if (!email || !roleKey) {
    throw new Error(`Invite email and role are required`);
  }
  await postAdminMutation(`/admin-v2/admins/invite`, { email, roleKey }, `Failed to invite admin`);
  revalidateAdminPaths();
}

export async function deactivateAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/admins/${adminId}/deactivate`,
    { version, confirmed, reason: reason || null },
    `Failed to deactivate admin`,
  );
  revalidateAdminPaths(adminId);
}

export async function restoreAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  await postAdminMutation(`/admin-v2/admins/${adminId}/restore`, { version }, `Failed to restore admin`);
  revalidateAdminPaths(adminId);
}

export async function changeAdminRoleAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const roleKey = String(formData.get(`roleKey`) ?? ``).trim();
  if (!roleKey) {
    throw new Error(`Role is required`);
  }
  await postAdminMutation(
    `/admin-v2/admins/${adminId}/role-change`,
    { version, confirmed, roleKey },
    `Failed to change admin role`,
  );
  revalidateAdminPaths(adminId);
}

export async function changeAdminPermissionsAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  await postAdminMutation(
    `/admin-v2/admins/${adminId}/permissions-change`,
    { version, capabilityOverrides: buildAdminCapabilityOverrides(formData) },
    `Failed to change admin permissions`,
  );
  revalidateAdminPaths(adminId);
}

function revalidateVerificationAssignmentPaths(consumerId: string) {
  revalidatePath(`/verification`);
  revalidatePath(`/verification/${consumerId}`);
}

export async function claimVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/claim`,
    { resourceType: `verification`, resourceId: consumerId, reason: reason || null },
    `Failed to claim verification assignment`,
  );
  revalidateVerificationAssignmentPaths(consumerId);
}

export async function releaseVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
  }
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  if (!assignmentId) {
    throw new Error(`assignmentId is required`);
  }
  const reason = String(formData.get(`reason`) ?? ``).trim();
  await postAdminMutation(
    `/admin-v2/assignments/release`,
    { assignmentId, reason: reason || null, expectedReleasedAtNull: 0 },
    `Failed to release verification assignment`,
  );
  revalidateVerificationAssignmentPaths(consumerId);
}

export async function reassignVerificationAssignmentAction(consumerId: string, formData: FormData): Promise<void> {
  if (!consumerId) {
    throw new Error(`consumerId is required`);
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
    `Failed to reassign verification`,
  );
  revalidateVerificationAssignmentPaths(consumerId);
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

const SAVED_VIEW_WORKSPACE_PATHS: Record<string, string> = {
  ledger_anomalies: `/ledger/anomalies`,
};

function revalidateSavedViewWorkspace(workspace: string) {
  const path = SAVED_VIEW_WORKSPACE_PATHS[workspace];
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

  await postAdminMutation(
    `/admin-v2/saved-views`,
    {
      workspace,
      name,
      description: description || null,
      queryPayload,
    },
    `Failed to create saved view`,
  );
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

  await patchAdminMutation(`/admin-v2/saved-views/${savedViewId}`, body, `Failed to update saved view`);
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  revalidateSavedViewWorkspace(workspace || `ledger_anomalies`);
}

export async function deleteSavedViewAction(savedViewId: string, formData: FormData): Promise<void> {
  if (!savedViewId) {
    throw new Error(`savedViewId is required`);
  }
  await deleteAdminMutation(
    `/admin-v2/saved-views/${savedViewId}`,
    { expectedDeletedAtNull: 0 },
    `Failed to delete saved view`,
  );
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  revalidateSavedViewWorkspace(workspace || `ledger_anomalies`);
}
