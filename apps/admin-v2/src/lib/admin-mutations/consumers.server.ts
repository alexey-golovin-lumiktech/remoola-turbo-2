'use server';

import {
  adminV2ForceLogoutConsumerBodySchema,
  adminV2ResendConsumerEmailBodySchema,
  adminV2SuspendConsumerBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation, patchAdminMutation } from './core.server';
import { parseRequiredVersion } from './form-helpers';
import { revalidateConsumerDetailPaths, revalidateConsumerPaths } from './revalidation';

import type { FormActionState } from './form-action-state';

export async function createConsumerNoteAction(consumerId: string, formData: FormData): Promise<void> {
  const content = String(formData.get(`content`) ?? ``).trim();
  if (!content) {
    throw new Error(`content is required`);
  }
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/notes`, { content }, `Failed to create note`);
  revalidateConsumerPaths(consumerId);
}

export async function createConsumerNoteFormAction(
  consumerId: string,
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await createConsumerNoteAction(consumerId, formData);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : `Failed to create note` };
  }
}

export async function addConsumerFlagAction(consumerId: string, formData: FormData): Promise<void> {
  const flag = String(formData.get(`flag`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  if (!flag) {
    throw new Error(`flag is required`);
  }
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/flags`,
    { flag, reason: reason || null },
    `Failed to add flag`,
  );
  revalidateConsumerPaths(consumerId);
}

export async function addConsumerFlagFormAction(
  consumerId: string,
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await addConsumerFlagAction(consumerId, formData);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : `Failed to add flag` };
  }
}

export async function removeConsumerFlagAction(consumerId: string, flagId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  await patchAdminMutation(
    `/admin-v2/consumers/${consumerId}/flags/${flagId}/remove`,
    { version },
    `Failed to remove flag`,
  );
  revalidateConsumerPaths(consumerId);
}

export async function forceLogoutConsumerAction(consumerId: string, formData: FormData): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2ForceLogoutConsumerBodySchema.parse({ confirmed });
  await postAdminMutation(
    `/admin-v2/consumers/${consumerId}/force-logout`,
    body,
    `Failed to force logout consumer sessions`,
  );
  revalidateConsumerDetailPaths(consumerId, true);
}

export async function suspendConsumerAction(consumerId: string, formData: FormData): Promise<void> {
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const body = adminV2SuspendConsumerBodySchema.parse({ confirmed, reason });
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/suspend`, body, `Failed to suspend consumer`);
  revalidateConsumerPaths(consumerId, true);
}

export async function resendConsumerEmailAction(consumerId: string, formData: FormData): Promise<void> {
  const emailKind = String(formData.get(`emailKind`) ?? ``).trim();
  const appScope = String(formData.get(`appScope`) ?? ``).trim();
  const body = adminV2ResendConsumerEmailBodySchema.parse({ emailKind, appScope });
  await postAdminMutation(`/admin-v2/consumers/${consumerId}/email-resend`, body, `Failed to resend consumer email`);
  revalidateConsumerDetailPaths(consumerId);
}
