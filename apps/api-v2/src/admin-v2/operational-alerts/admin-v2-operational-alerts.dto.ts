import { BadRequestException } from '@nestjs/common';
import { Expose, Transform, Type } from 'class-transformer';
import { Allow, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

import {
  ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_NAME_LENGTH,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
  ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MIN_OPERATIONAL_ALERT_NAME_LENGTH,
  ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES,
  getAdminV2JsonPayloadBytes,
  isAdminV2OperationalAlertWorkspace,
  type AdminV2OperationalAlertCreateBody,
  type AdminV2OperationalAlertDeleteBody,
  type AdminV2OperationalAlertThreshold,
  type AdminV2OperationalAlertThresholdQueryPayload,
  type AdminV2OperationalAlertUpdateBody,
  type AdminV2OperationalAlertWorkspace,
} from '@remoola/api-types';

import { ExpectedDeletedAtNullBody } from '../admin-v2-common.dto';

export const OPERATIONAL_ALERT_WORKSPACES = ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES;
export type OperationalAlertWorkspace = AdminV2OperationalAlertWorkspace;

export const MIN_OPERATIONAL_ALERT_NAME_LENGTH = ADMIN_V2_MIN_OPERATIONAL_ALERT_NAME_LENGTH;
export const MAX_OPERATIONAL_ALERT_NAME_LENGTH = ADMIN_V2_MAX_OPERATIONAL_ALERT_NAME_LENGTH;
export const MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH = ADMIN_V2_MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH;
export const MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES = ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES;
export const MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES = ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES;
export const MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES = ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES;
export const MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES = ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES;
export const DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES = ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES;

function isOperationalAlertWorkspace(value: string): value is OperationalAlertWorkspace {
  return isAdminV2OperationalAlertWorkspace(value);
}

export function assertOperationalAlertWorkspace(value: string): asserts value is OperationalAlertWorkspace {
  if (!isOperationalAlertWorkspace(value)) {
    throw new BadRequestException(`Unknown workspace: ${value}`);
  }
}

export function assertValidQueryPayload(value: unknown): asserts value is Record<string, unknown> | unknown[] | null {
  if (value === undefined) {
    throw new BadRequestException(`queryPayload is required (use null for empty)`);
  }
  if (typeof value === `string` || typeof value === `number` || typeof value === `boolean`) {
    throw new BadRequestException(`queryPayload must be object, array, or null`);
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new BadRequestException(`queryPayload contains non-serializable value`);
  }
  if (getAdminV2JsonPayloadBytes(value) > MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES) {
    throw new BadRequestException(`queryPayload exceeds ${MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES} bytes`);
  }
}

class OperationalAlertThreshold implements AdminV2OperationalAlertThreshold {
  @Expose()
  @IsString()
  type: `count_gt`;

  @Expose()
  @IsInt()
  @IsPositive()
  @Min(ADMIN_V2_MIN_COUNT_GT_VALUE)
  @Max(ADMIN_V2_MIN_COUNT_GT_VALUE)
  value: number;
}
export class OperationalAlertCreateBody implements AdminV2OperationalAlertCreateBody {
  @Expose()
  @IsString()
  workspace!: OperationalAlertWorkspace;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @Transform(({ obj }) => obj.queryPayload)
  @Allow()
  queryPayload!: AdminV2OperationalAlertThresholdQueryPayload;

  @Expose()
  @Transform(({ obj }) => obj.thresholdPayload)
  @Allow()
  thresholdPayload!: OperationalAlertThreshold;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evaluationIntervalMinutes?: number;
}

export class OperationalAlertUpdateBody extends ExpectedDeletedAtNullBody implements AdminV2OperationalAlertUpdateBody {
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @Transform(({ obj }) => obj.queryPayload)
  @IsOptional()
  queryPayload?: unknown;

  @Expose()
  @Transform(({ obj }) => obj.thresholdPayload)
  @IsOptional()
  thresholdPayload?: OperationalAlertThreshold;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evaluationIntervalMinutes?: number;
}

export class OperationalAlertDeleteBody
  extends ExpectedDeletedAtNullBody
  implements AdminV2OperationalAlertDeleteBody {}
