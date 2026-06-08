import { BadRequestException } from '@nestjs/common';

import {
  type AdminV2OperationalAlertSummary,
  type AdminV2OperationalAlertSummaryWorkspace,
  type AdminV2OperationalAlertThreshold,
  type AdminV2OperationalAlertThresholdQueryPayload,
} from '@remoola/api-types';

import {
  DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH,
  MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MAX_OPERATIONAL_ALERT_NAME_LENGTH,
  MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MIN_OPERATIONAL_ALERT_NAME_LENGTH,
  type OperationalAlertWorkspace,
  assertOperationalAlertWorkspace,
} from './admin-v2-operational-alerts.dto';

export type OperationalAlertSummary = AdminV2OperationalAlertSummary;

export type OperationalAlertRow = {
  id: string;
  ownerId: string;
  workspace: AdminV2OperationalAlertSummaryWorkspace;
  name: string;
  description: string | null;
  queryPayload: AdminV2OperationalAlertThresholdQueryPayload;
  thresholdPayload: AdminV2OperationalAlertThreshold;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: Date | null;
  lastEvaluationError: string | null;
  lastFiredAt: Date | null;
  lastFireReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type UpdatePresence = {
  hasName: boolean;
  hasDescription: boolean;
  hasQueryPayload: boolean;
  hasThresholdPayload: boolean;
  hasInterval: boolean;
};

export function toSummary(row: OperationalAlertRow): OperationalAlertSummary {
  return {
    id: row.id,
    workspace: row.workspace,
    name: row.name,
    description: row.description,
    queryPayload: row.queryPayload,
    thresholdPayload: row.thresholdPayload,
    evaluationIntervalMinutes: row.evaluationIntervalMinutes,
    lastEvaluatedAt: row.lastEvaluatedAt ? row.lastEvaluatedAt.toISOString() : null,
    lastEvaluationError: row.lastEvaluationError,
    lastFiredAt: row.lastFiredAt ? row.lastFiredAt.toISOString() : null,
    lastFireReason: row.lastFireReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function trimRequiredName(raw: string | null | undefined): string {
  const trimmed = (raw ?? ``).trim();
  if (trimmed.length < MIN_OPERATIONAL_ALERT_NAME_LENGTH) {
    throw new BadRequestException(`name is required`);
  }
  if (trimmed.length > MAX_OPERATIONAL_ALERT_NAME_LENGTH) {
    throw new BadRequestException(`name is too long (max ${MAX_OPERATIONAL_ALERT_NAME_LENGTH} characters)`);
  }
  return trimmed;
}

export function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH) {
    throw new BadRequestException(
      `description is too long (max ${MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH} characters)`,
    );
  }
  return trimmed;
}

export function normalizeEvaluationInterval(raw: number | null | undefined): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES;
  }
  if (typeof raw !== `number` || !Number.isInteger(raw)) {
    throw new BadRequestException(`evaluationIntervalMinutes must be an integer`);
  }
  if (raw < MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES || raw > MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES) {
    const min = MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES;
    const max = MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES;
    throw new BadRequestException(`evaluationIntervalMinutes must be between ${min} and ${max}`);
  }
  return raw;
}

export function assertExpectedDeletedAtNull(value: number) {
  if (value !== 0) {
    throw new BadRequestException(`expectedDeletedAtNull must be 0`);
  }
}

export function assertRequiredWorkspace(value: unknown): OperationalAlertWorkspace {
  if (typeof value !== `string` || !value) {
    throw new BadRequestException(`workspace is required`);
  }

  assertOperationalAlertWorkspace(value);
  return value;
}

export function buildChangedFields(params: UpdatePresence): string[] {
  return [
    ...(params.hasName ? [`name`] : []),
    ...(params.hasDescription ? [`description`] : []),
    ...(params.hasQueryPayload ? [`queryPayload`] : []),
    ...(params.hasThresholdPayload ? [`thresholdPayload`] : []),
    ...(params.hasInterval ? [`evaluationIntervalMinutes`] : []),
  ];
}

export function shouldResetEvaluationState(
  params: Pick<UpdatePresence, `hasQueryPayload` | `hasThresholdPayload` | `hasInterval`>,
) {
  return params.hasQueryPayload || params.hasThresholdPayload || params.hasInterval;
}

export function assertHasUpdateFields(params: UpdatePresence) {
  if (
    !params.hasName &&
    !params.hasDescription &&
    !params.hasQueryPayload &&
    !params.hasThresholdPayload &&
    !params.hasInterval
  ) {
    throw new BadRequestException(`No fields to update`);
  }
}

export function buildCreateAuditMetadata(params: {
  workspace: OperationalAlertWorkspace;
  name: string;
  evaluationIntervalMinutes: number;
  queryPayloadBytes: number;
  thresholdPayloadBytes: number;
  thresholdType: string;
}) {
  return {
    workspace: params.workspace,
    name: params.name,
    evaluationIntervalMinutes: params.evaluationIntervalMinutes,
    queryPayloadBytes: params.queryPayloadBytes,
    thresholdPayloadBytes: params.thresholdPayloadBytes,
    thresholdType: params.thresholdType,
    severity: `standard` as const,
  };
}

export function buildUpdateAuditMetadata(
  params: UpdatePresence & {
    workspace: string;
    previousName: string;
    nextName?: string;
    queryPayloadBytes: number | null;
    thresholdPayloadBytes: number | null;
    thresholdType: string | null;
    evaluationIntervalMinutes?: number;
  },
) {
  return {
    workspace: params.workspace,
    changedFields: buildChangedFields(params),
    evaluationStateReset: shouldResetEvaluationState(params),
    ...(params.hasName && params.nextName !== params.previousName ? { previousName: params.previousName } : {}),
    ...(params.queryPayloadBytes !== null ? { queryPayloadBytes: params.queryPayloadBytes } : {}),
    ...(params.thresholdPayloadBytes !== null ? { thresholdPayloadBytes: params.thresholdPayloadBytes } : {}),
    ...(params.thresholdType !== null ? { thresholdType: params.thresholdType } : {}),
    ...(params.hasInterval ? { evaluationIntervalMinutes: params.evaluationIntervalMinutes } : {}),
    severity: `standard` as const,
  };
}

export function buildDeleteAuditMetadata(params: { workspace: string; name: string }) {
  return {
    workspace: params.workspace,
    name: params.name,
    severity: `standard` as const,
  };
}
