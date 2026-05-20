'use server';

import { revalidatePath } from 'next/cache';

import {
  adminV2ChangeAdminPermissionsBodySchema,
  adminV2ChangeAdminRoleBodySchema,
  adminV2DeactivateAdminBodySchema,
  adminV2InviteAdminBodySchema,
  adminV2StepUpVersionedMutationBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation } from './core.server';
import { parseRequiredVersion, parsePasswordConfirmation, buildAdminCapabilityOverrides } from './form-helpers';
import { revalidateAdminPaths } from './revalidation';

export async function inviteAdminAction(formData: FormData): Promise<void> {
  const email = String(formData.get(`email`) ?? ``).trim();
  const roleKey = String(formData.get(`roleKey`) ?? ``).trim();
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2InviteAdminBodySchema.parse({ email, roleKey, passwordConfirmation });
  await postAdminMutation(`/admin-v2/admins/invite`, body, `Failed to invite admin`);
  revalidateAdminPaths();
}

export async function deactivateAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const reason = String(formData.get(`reason`) ?? ``).trim();
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2DeactivateAdminBodySchema.parse({
    version,
    confirmed,
    reason: reason || undefined,
    passwordConfirmation,
  });
  await postAdminMutation(`/admin-v2/admins/${adminId}/deactivate`, body, `Failed to deactivate admin`);
  revalidateAdminPaths(adminId);
}

export async function restoreAdminAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2StepUpVersionedMutationBodySchema.parse({ version, passwordConfirmation });
  await postAdminMutation(`/admin-v2/admins/${adminId}/restore`, body, `Failed to restore admin`);
  revalidateAdminPaths(adminId);
}

export async function changeAdminRoleAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const roleKey = String(formData.get(`roleKey`) ?? ``).trim();
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2ChangeAdminRoleBodySchema.parse({ version, confirmed, roleKey, passwordConfirmation });
  await postAdminMutation(`/admin-v2/admins/${adminId}/role-change`, body, `Failed to change admin role`);
  revalidateAdminPaths(adminId);
}

export async function changeAdminPermissionsAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2ChangeAdminPermissionsBodySchema.parse({
    version,
    capabilityOverrides: buildAdminCapabilityOverrides(formData),
    passwordConfirmation,
  });
  await postAdminMutation(`/admin-v2/admins/${adminId}/permissions-change`, body, `Failed to change admin permissions`);
  revalidateAdminPaths(adminId);
}

export async function resetAdminPasswordAction(adminId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const passwordConfirmation = parsePasswordConfirmation(formData);
  const body = adminV2StepUpVersionedMutationBodySchema.parse({ version, passwordConfirmation });
  await postAdminMutation(`/admin-v2/admins/${adminId}/password-reset`, body, `Failed to send admin password reset`);
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
