'use server';

import {
  adminV2SavedViewCreateBodySchema,
  adminV2SavedViewDeleteBodySchema,
  adminV2SavedViewUpdateBodySchema,
} from '@remoola/api-types';

import { postAdminMutation, patchAdminMutation, deleteAdminMutation } from './core.server';
import { parseSavedViewPayload } from './form-helpers';
import { revalidateSavedViewWorkspace } from './revalidation';

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
