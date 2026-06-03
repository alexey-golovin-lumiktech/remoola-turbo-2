'use server';

import {
  adminV2DocumentBulkTagBodySchema,
  adminV2DocumentRetagBodySchema,
  adminV2DocumentTagCreateBodySchema,
  adminV2DocumentTagDeleteBodySchema,
  adminV2DocumentTagUpdateBodySchema,
} from '@remoola/api-types';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation, patchAdminMutation, deleteAdminMutation } from './core.server';
import { parseRequiredVersion, parseStringList } from './form-helpers';
import { revalidateDocumentsPaths, revalidateDocumentAssignmentPaths } from './revalidation';
import {
  runAssignmentClaim,
  runAssignmentReassign,
  runAssignmentRelease,
} from '../admin-permissions/assignment-action-core';

import type { FormActionState } from './form-action-state';

export async function createDocumentTagAction(formData: FormData): Promise<void> {
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`Tag name is required`);
  }
  const body = adminV2DocumentTagCreateBodySchema.parse({ name });
  await postAdminMutation(`/admin-v2/documents/tags`, body, `Failed to create document tag`);
  revalidateDocumentsPaths();
}

export async function createDocumentTagFormAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await createDocumentTagAction(formData);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : `Failed to create document tag` };
  }
}

export async function updateDocumentTagAction(tagId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`Tag name is required`);
  }
  const body = adminV2DocumentTagUpdateBodySchema.parse({ version, name });
  await patchAdminMutation(`/admin-v2/documents/tags/${tagId}`, body, `Failed to update document tag`);
  revalidateDocumentsPaths();
}

export async function deleteDocumentTagAction(tagId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const confirmed = parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`]);
  const body = adminV2DocumentTagDeleteBodySchema.parse({ version, confirmed });
  await deleteAdminMutation(`/admin-v2/documents/tags/${tagId}`, body, `Failed to delete document tag`);
  revalidateDocumentsPaths();
}

export async function retagDocumentAction(documentId: string, formData: FormData): Promise<void> {
  const version = parseRequiredVersion(formData);
  const tagIds = parseStringList(formData, `tagIds`);
  const body = adminV2DocumentRetagBodySchema.parse({ version, tagIds });
  await postAdminMutation(`/admin-v2/documents/${documentId}/retag`, body, `Failed to retag document`);
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
  const body = adminV2DocumentBulkTagBodySchema.parse({ tagIds, resources });
  await postAdminMutation(`/admin-v2/documents/bulk-tag`, body, `Failed to bulk tag selected documents`);
  revalidateDocumentsPaths();
}

export async function claimDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  return runAssignmentClaim({
    resourceType: `document`,
    resourceId: documentId,
    idLabel: `documentId`,
    errorMessage: `Failed to claim document assignment`,
    formData,
    revalidate: () => revalidateDocumentAssignmentPaths(documentId),
  });
}

export async function releaseDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  return runAssignmentRelease({
    resourceId: documentId,
    idLabel: `documentId`,
    errorMessage: `Failed to release document assignment`,
    formData,
    revalidate: () => revalidateDocumentAssignmentPaths(documentId),
  });
}

export async function reassignDocumentAssignmentAction(documentId: string, formData: FormData): Promise<void> {
  return runAssignmentReassign({
    resourceId: documentId,
    idLabel: `documentId`,
    errorMessage: `Failed to reassign document assignment`,
    formData,
    revalidate: () => revalidateDocumentAssignmentPaths(documentId),
  });
}
