'use server';

import { parseConfirmedFormValue } from '../admin-confirmation';
import { postAdminMutation, patchAdminMutation, deleteAdminMutation } from './core.server';
import { parseRequiredVersion, parseStringList } from './form-helpers';
import { revalidateDocumentsPaths, revalidateDocumentAssignmentPaths } from './revalidation';

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
