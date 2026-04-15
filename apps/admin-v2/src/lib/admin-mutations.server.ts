'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { buildAdminMutationHeaders } from './admin-auth-headers.server';
import { parseConfirmedFormValue } from './admin-confirmation';
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

async function postAdminMutation(path: string, body: unknown, fallbackMessage: string): Promise<void> {
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}${path}`, {
    method: `POST`,
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
  await postAdminMutation(
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
