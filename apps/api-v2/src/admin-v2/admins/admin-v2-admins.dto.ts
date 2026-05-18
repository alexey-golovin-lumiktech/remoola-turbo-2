import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  type AdminV2AdminPasswordPatchBody,
  type AdminV2ChangeAdminPermissionsBody,
  type AdminV2ChangeAdminRoleBody,
  type AdminV2DeactivateAdminBody,
  type AdminV2InviteAdminBody,
  type AdminV2LegacyAdminStatusBody,
  type AdminV2PermissionOverride,
} from '@remoola/api-types';

import { constants } from '../../shared-common';
import { StepUpVersionedMutationBody } from '../admin-v2-common.dto';

export class InviteAdminBody implements AdminV2InviteAdminBody {
  @Expose()
  @IsEmail()
  email!: string;

  @Expose()
  @IsString()
  roleKey!: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

export class VersionedAdminMutationBody extends StepUpVersionedMutationBody {}

export class DeactivateAdminBody extends VersionedAdminMutationBody implements AdminV2DeactivateAdminBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangeAdminRoleBody extends VersionedAdminMutationBody implements AdminV2ChangeAdminRoleBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  roleKey!: string;
}

class PermissionOverride implements AdminV2PermissionOverride {
  @Expose()
  @IsString()
  capability!: string;

  @Expose()
  @IsString()
  @IsIn([`inherit`, `grant`, `deny`])
  mode!: `inherit` | `grant` | `deny`;
}

export class ChangeAdminPermissionsBody
  extends VersionedAdminMutationBody
  implements AdminV2ChangeAdminPermissionsBody
{
  @Expose()
  @Type(() => PermissionOverride)
  @IsArray()
  @ValidateNested({ each: true })
  capabilityOverrides!: PermissionOverride[];
}

export class ListAdminsQuery {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;
}

export class AdminPasswordPatchBody implements AdminV2AdminPasswordPatchBody {
  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

export class LegacyAdminStatusBody implements AdminV2LegacyAdminStatusBody {
  @Expose()
  @IsIn([`delete`, `restore`])
  action!: `delete` | `restore`;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  passwordConfirmation?: string;
}
