import {
  adminV2AssignmentClaimBodySchema,
  adminV2AssignmentReassignBodySchema,
  adminV2AssignmentReleaseBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { ADMIN_V2_PERMISSION_OVERRIDE_OPTIONS } from '../admin-rbac';

export function parseRequiredVersion(formData: FormData): number {
  const version = Number(formData.get(`version`) ?? 0);
  if (!Number.isFinite(version) || version < 1) {
    throw new Error(`Valid version is required`);
  }
  return version;
}

export function parseOptionalConsumerId(formData: FormData): string | null {
  const consumerId = String(formData.get(`consumerId`) ?? ``).trim();
  return consumerId || null;
}

export function parseStringList(formData: FormData, fieldName: string): string[] {
  return formData
    .getAll(fieldName)
    .map((value) => String(value ?? ``).trim())
    .filter(Boolean);
}

export function parsePasswordConfirmation(formData: FormData) {
  return String(formData.get(`passwordConfirmation`) ?? ``).trim();
}

export function parseSavedViewPayload(raw: string | null): unknown {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`Saved view payload is not valid JSON`);
  }
}

export function parseOperationalAlertJsonField(raw: string | null, label: string): unknown {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function parsePositiveIntegerField(raw: string | null, label: string): number | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
}

export function parseCheckboxField(raw: FormDataEntryValue | null): boolean | undefined {
  if (raw == null) return undefined;
  const value = String(raw).trim().toLowerCase();
  if (!value) return undefined;
  if (value === `true` || value === `on` || value === `1`) return true;
  if (value === `false` || value === `0`) return false;
  throw new Error(`checkbox field must be boolean-like`);
}

export function parseTrimmedField(raw: FormDataEntryValue | null): string | undefined {
  if (raw == null) return undefined;
  const value = String(raw).trim();
  return value || undefined;
}

export function buildOperationalAlertQueryPayload(workspace: string, formData: FormData): unknown {
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

export function buildOperationalAlertThresholdPayload(formData: FormData): unknown {
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

export function buildAdminCapabilityOverrides(formData: FormData) {
  return ADMIN_V2_PERMISSION_OVERRIDE_OPTIONS.map(({ capability }) => ({
    capability,
    mode: String(formData.get(`capability_override_${capability}`) ?? `inherit`),
  }));
}

export function buildAssignmentClaimBody(resourceType: string, resourceId: string, formData: FormData) {
  const reason = String(formData.get(`reason`) ?? ``).trim();
  return adminV2AssignmentClaimBodySchema.parse({
    resourceType,
    resourceId,
    reason: reason || undefined,
  });
}

export function buildAssignmentReleaseBody(formData: FormData) {
  const assignmentId = String(formData.get(`assignmentId`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  return adminV2AssignmentReleaseBodySchema.parse({
    assignmentId,
    reason: reason || undefined,
    expectedReleasedAtNull: 0,
  });
}

export function buildAssignmentReassignBody(formData: FormData) {
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
