import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export const SAVED_VIEW_WORKSPACES = [`ledger_anomalies`, `verification_queue`] as const;
export type SavedViewWorkspace = (typeof SAVED_VIEW_WORKSPACES)[number];

export const MIN_SAVED_VIEW_NAME_LENGTH = 1;
export const MAX_SAVED_VIEW_NAME_LENGTH = 100;
export const MAX_SAVED_VIEW_DESCRIPTION_LENGTH = 500;
export const MAX_SAVED_VIEW_PAYLOAD_BYTES = 4096;

export function isSavedViewWorkspace(value: string): value is SavedViewWorkspace {
  return (SAVED_VIEW_WORKSPACES as readonly string[]).includes(value);
}

export function assertSavedViewWorkspace(value: string): asserts value is SavedViewWorkspace {
  if (!isSavedViewWorkspace(value)) {
    throw new BadRequestException(`Unknown workspace: ${value}`);
  }
}

export function assertValidPayload(value: unknown): asserts value is Record<string, unknown> | unknown[] | null {
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
  if (Buffer.byteLength(serialized, `utf8`) > MAX_SAVED_VIEW_PAYLOAD_BYTES) {
    throw new BadRequestException(`queryPayload exceeds ${MAX_SAVED_VIEW_PAYLOAD_BYTES} bytes`);
  }
}

export class SavedViewListQueryDTO {
  @Expose()
  @IsString()
  workspace!: string;
}

export class SavedViewCreateBodyDTO {
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
}

export class SavedViewUpdateBodyDTO {
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
  @Type(() => Number)
  @IsNumber()
  expectedDeletedAtNull!: number;
}

export class SavedViewDeleteBodyDTO {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  expectedDeletedAtNull!: number;
}
