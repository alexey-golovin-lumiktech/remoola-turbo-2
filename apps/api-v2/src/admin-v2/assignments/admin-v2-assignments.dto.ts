import { BadRequestException } from '@nestjs/common';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export const ASSIGNABLE_RESOURCE_TYPES = [`verification`, `ledger_entry`] as const;
export type AssignableResourceType = (typeof ASSIGNABLE_RESOURCE_TYPES)[number];

export const MIN_ASSIGNMENT_REASON_LENGTH = 10;
export const MAX_ASSIGNMENT_REASON_LENGTH = 500;

export function isAssignableResourceType(value: string): value is AssignableResourceType {
  return (ASSIGNABLE_RESOURCE_TYPES as readonly string[]).includes(value);
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
