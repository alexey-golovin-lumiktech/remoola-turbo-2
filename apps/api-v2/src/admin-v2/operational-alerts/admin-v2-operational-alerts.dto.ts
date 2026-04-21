import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export const OPERATIONAL_ALERT_WORKSPACES = [`ledger_anomalies`] as const;
export type OperationalAlertWorkspace = (typeof OPERATIONAL_ALERT_WORKSPACES)[number];

export const MIN_OPERATIONAL_ALERT_NAME_LENGTH = 1;
export const MAX_OPERATIONAL_ALERT_NAME_LENGTH = 100;
export const MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH = 500;
export const MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES = 4096;
export const MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES = 1024;
export const MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1;
export const MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1440;
export const DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES = 5;

export function isOperationalAlertWorkspace(value: string): value is OperationalAlertWorkspace {
  return (OPERATIONAL_ALERT_WORKSPACES as readonly string[]).includes(value);
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
  if (Buffer.byteLength(serialized, `utf8`) > MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES) {
    throw new BadRequestException(`queryPayload exceeds ${MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES} bytes`);
  }
}

export class OperationalAlertListQueryDTO {
  @Expose()
  @IsString()
  workspace!: string;
}

export class OperationalAlertCreateBodyDTO {
  @Expose()
  @IsString()
  workspace!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  queryPayload!: unknown;

  @Expose()
  thresholdPayload!: unknown;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evaluationIntervalMinutes?: number;
}

export class OperationalAlertUpdateBodyDTO {
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsOptional()
  queryPayload?: unknown;

  @Expose()
  @IsOptional()
  thresholdPayload?: unknown;

  @Expose()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evaluationIntervalMinutes?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  expectedDeletedAtNull!: number;
}

export class OperationalAlertDeleteBodyDTO {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  expectedDeletedAtNull!: number;
}
