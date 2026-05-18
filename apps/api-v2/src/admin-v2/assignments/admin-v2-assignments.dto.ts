import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { Equals, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import {
  ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES,
  ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH,
  ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH,
  isAdminV2AssignableResourceType,
  type AdminV2AssignableResourceType,
  type AdminV2AssignmentClaimBody,
  type AdminV2AssignmentReassignBody,
  type AdminV2AssignmentReleaseBody,
} from '@remoola/api-types';

export const ASSIGNABLE_RESOURCE_TYPES = ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES;
export type AssignableResourceType = AdminV2AssignableResourceType;

export const MIN_ASSIGNMENT_REASON_LENGTH = ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH;
export const MAX_ASSIGNMENT_REASON_LENGTH = ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH;

function isAssignableResourceType(value: string): value is AssignableResourceType {
  return isAdminV2AssignableResourceType(value);
}

export function assertResourceType(value: string): asserts value is AssignableResourceType {
  if (!isAssignableResourceType(value)) {
    throw new BadRequestException(`Unknown resourceType: ${value}`);
  }
}

export class AssignmentClaimBody implements AdminV2AssignmentClaimBody {
  @Expose()
  @IsIn(ASSIGNABLE_RESOURCE_TYPES)
  resourceType!: AssignableResourceType;

  @Expose()
  @IsUUID()
  resourceId!: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ASSIGNMENT_REASON_LENGTH)
  reason?: string;
}

export class AssignmentReleaseBody implements AdminV2AssignmentReleaseBody {
  @Expose()
  @IsUUID()
  assignmentId!: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ASSIGNMENT_REASON_LENGTH)
  reason?: string;

  @Expose()
  @Type(() => Number)
  @Equals(0)
  expectedReleasedAtNull!: number;
}

export class AssignmentReassignBody implements AdminV2AssignmentReassignBody {
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
  @MinLength(MIN_ASSIGNMENT_REASON_LENGTH)
  @MaxLength(MAX_ASSIGNMENT_REASON_LENGTH)
  reason!: string;

  @Expose()
  @Type(() => Number)
  @Equals(0)
  expectedReleasedAtNull!: number;
}
