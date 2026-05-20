'use server';

import {
  adminV2OperationalAlertCreateBodySchema,
  adminV2OperationalAlertDeleteBodySchema,
  adminV2OperationalAlertUpdateBodySchema,
} from '@remoola/api-types';

import { postAdminMutation, patchAdminMutation, deleteAdminMutation } from './core.server';
import {
  parsePositiveIntegerField,
  buildOperationalAlertQueryPayload,
  buildOperationalAlertThresholdPayload,
} from './form-helpers';
import { revalidateOperationalAlerts } from './revalidation';

export async function createOperationalAlertAction(formData: FormData): Promise<void> {
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  if (!workspace) {
    throw new Error(`workspace is required`);
  }
  const name = String(formData.get(`name`) ?? ``).trim();
  if (!name) {
    throw new Error(`name is required`);
  }
  const description = String(formData.get(`description`) ?? ``).trim();
  const queryPayload = buildOperationalAlertQueryPayload(workspace, formData);
  const thresholdPayload = buildOperationalAlertThresholdPayload(formData);
  const evaluationIntervalMinutes = parsePositiveIntegerField(
    formData.get(`evaluationIntervalMinutes`) as string | null,
    `evaluationIntervalMinutes`,
  );

  const body: Record<string, unknown> = {
    workspace,
    name,
    description: description || null,
    queryPayload,
    thresholdPayload,
  };
  if (evaluationIntervalMinutes !== undefined) {
    body.evaluationIntervalMinutes = evaluationIntervalMinutes;
  }
  const parsedBody = adminV2OperationalAlertCreateBodySchema.parse(body);

  await postAdminMutation(`/admin-v2/operational-alerts`, parsedBody, `Failed to create operational alert`);
  revalidateOperationalAlerts();
}

export async function updateOperationalAlertAction(operationalAlertId: string, formData: FormData): Promise<void> {
  if (!operationalAlertId) {
    throw new Error(`operationalAlertId is required`);
  }
  const body: {
    expectedDeletedAtNull: number;
    name?: string;
    description?: string | null;
    queryPayload?: unknown;
    thresholdPayload?: unknown;
    evaluationIntervalMinutes?: number;
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
  const rawQuery = formData.get(`queryPayload`);
  const workspace = String(formData.get(`workspace`) ?? ``).trim();
  if (rawQuery !== null || workspace) {
    body.queryPayload = buildOperationalAlertQueryPayload(workspace, formData);
  }
  const rawThreshold = formData.get(`thresholdPayload`);
  if (rawThreshold !== null || formData.get(`countThreshold`) !== null) {
    body.thresholdPayload = buildOperationalAlertThresholdPayload(formData);
  }
  const interval = parsePositiveIntegerField(
    formData.get(`evaluationIntervalMinutes`) as string | null,
    `evaluationIntervalMinutes`,
  );
  if (interval !== undefined) {
    body.evaluationIntervalMinutes = interval;
  }

  const parsedBody = adminV2OperationalAlertUpdateBodySchema.parse(body);
  await patchAdminMutation(
    `/admin-v2/operational-alerts/${operationalAlertId}`,
    parsedBody,
    `Failed to update operational alert`,
  );
  revalidateOperationalAlerts();
}

export async function deleteOperationalAlertAction(operationalAlertId: string, formData: FormData): Promise<void> {
  if (!operationalAlertId) {
    throw new Error(`operationalAlertId is required`);
  }
  void formData;
  await deleteAdminMutation(
    `/admin-v2/operational-alerts/${operationalAlertId}`,
    adminV2OperationalAlertDeleteBodySchema.parse({ expectedDeletedAtNull: 0 }),
    `Failed to delete operational alert`,
  );
  revalidateOperationalAlerts();
}
