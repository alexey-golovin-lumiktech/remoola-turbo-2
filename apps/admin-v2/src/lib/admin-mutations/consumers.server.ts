'use server';

import { revalidatePath } from 'next/cache';

import {
  adminV2ForceLogoutConsumerBodySchema,
  adminV2ResendConsumerEmailBodySchema,
  adminV2SuspendConsumerBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation, patchAdminMutation } from './core.server';

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
