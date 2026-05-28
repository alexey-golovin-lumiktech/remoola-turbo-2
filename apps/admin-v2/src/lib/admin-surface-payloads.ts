import {
  type AdminV2AuthRefreshReuseAlertQueryPayload,
  type AdminV2VerificationQueuePayload,
  adminV2AuthRefreshReuseAlertQueryPayloadSchema,
  adminV2VerificationQueuePayloadSchema,
} from '@remoola/api-types';

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

export function parseVerificationQueuePayload(raw: unknown): AdminV2VerificationQueuePayload | null {
  const parsed = adminV2VerificationQueuePayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function buildVerificationQueuePayloadFromForm(formData: FormData): AdminV2VerificationQueuePayload {
  return adminV2VerificationQueuePayloadSchema.parse({
    status: parseTrimmedField(formData.get(`status`)),
    stripeIdentityStatus: parseTrimmedField(formData.get(`stripeIdentityStatus`)),
    country: parseTrimmedField(formData.get(`country`)),
    contractorKind: parseTrimmedField(formData.get(`contractorKind`)),
    missingProfileData: parseCheckboxField(formData.get(`missingProfileData`)),
    missingDocuments: parseCheckboxField(formData.get(`missingDocuments`)),
  });
}

export function describeVerificationQueuePayload(payload: AdminV2VerificationQueuePayload): string {
  const parts = [
    payload.status ? `status=${payload.status}` : null,
    payload.stripeIdentityStatus ? `stripeIdentityStatus=${payload.stripeIdentityStatus}` : null,
    payload.country ? `country=${payload.country}` : null,
    payload.contractorKind ? `contractorKind=${payload.contractorKind}` : null,
    payload.missingProfileData ? `missingProfileData=true` : null,
    payload.missingDocuments ? `missingDocuments=true` : null,
  ].filter(Boolean);
  return parts.length === 0 ? `Filters: (none — total queue)` : `Filters: ${parts.join(`, `)}`;
}

export function parseAuthRefreshReuseAlertQueryPayload(raw: unknown): AdminV2AuthRefreshReuseAlertQueryPayload | null {
  const parsed = adminV2AuthRefreshReuseAlertQueryPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
