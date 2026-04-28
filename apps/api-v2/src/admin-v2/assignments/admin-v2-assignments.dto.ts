import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

import {
  ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES,
  ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH,
  ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH,
  isAdminV2AssignableResourceType,
  type AdminV2AssignableResourceType,
} from '@remoola/api-types';

export const ASSIGNABLE_RESOURCE_TYPES = ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES;
export type AssignableResourceType = AdminV2AssignableResourceType;

export const MIN_ASSIGNMENT_REASON_LENGTH = ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH;
export const MAX_ASSIGNMENT_REASON_LENGTH = ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH;

export function isAssignableResourceType(value: string): value is AssignableResourceType {
  return isAdminV2AssignableResourceType(value);
}

export function assertResourceType(value: string): asserts value is AssignableResourceType {
  if (!isAssignableResourceType(value)) {
    throw new BadRequestException(`Unknown resourceType: ${value}`);
  }
}

export class AssignmentClaimBodyDTO {
  @Expose()
  @IsString()
  resourceType!: string;

  @Expose()
  @IsUUID()
  resourceId!: string;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignmentReleaseBodyDTO {
  @Expose()
  @IsUUID()
  assignmentId!: string;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  expectedReleasedAtNull!: number;
}

export class AssignmentReassignBodyDTO {
  @Expose()
  @IsUUID()
  assignmentId!: string;

  @Expose()
  @IsUUID()
  newAssigneeId!: string;

  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  reason!: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  expectedReleasedAtNull!: number;
}
