import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

import {
  ADMIN_V2_MAX_SAVED_VIEW_DESCRIPTION_LENGTH,
  ADMIN_V2_MAX_SAVED_VIEW_NAME_LENGTH,
  ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES,
  ADMIN_V2_MIN_SAVED_VIEW_NAME_LENGTH,
  getAdminV2JsonPayloadBytes,
  isAdminV2SavedViewWorkspace,
  type AdminV2SavedViewWorkspace,
} from '@remoola/api-types';

export type SavedViewWorkspace = AdminV2SavedViewWorkspace;

export const MIN_SAVED_VIEW_NAME_LENGTH = ADMIN_V2_MIN_SAVED_VIEW_NAME_LENGTH;
export const MAX_SAVED_VIEW_NAME_LENGTH = ADMIN_V2_MAX_SAVED_VIEW_NAME_LENGTH;
export const MAX_SAVED_VIEW_DESCRIPTION_LENGTH = ADMIN_V2_MAX_SAVED_VIEW_DESCRIPTION_LENGTH;
export const MAX_SAVED_VIEW_PAYLOAD_BYTES = ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES;

export function isSavedViewWorkspace(value: string): value is SavedViewWorkspace {
  return isAdminV2SavedViewWorkspace(value);
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
  if (getAdminV2JsonPayloadBytes(value) > MAX_SAVED_VIEW_PAYLOAD_BYTES) {
    throw new BadRequestException(`queryPayload exceeds ${MAX_SAVED_VIEW_PAYLOAD_BYTES} bytes`);
  }
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
