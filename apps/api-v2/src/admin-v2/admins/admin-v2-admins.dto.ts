import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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
  type AdminV2ResetAdminPasswordBody,
  type AdminV2RestoreAdminBody,
} from '@remoola/api-types';

import { PagingQuery } from '../../common';
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

class VersionedAdminMutationBody extends StepUpVersionedMutationBody {}

export class RestoreAdminBody extends VersionedAdminMutationBody implements AdminV2RestoreAdminBody {}

export class ResetAdminPasswordBody extends VersionedAdminMutationBody implements AdminV2ResetAdminPasswordBody {}

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

export class ListAdminsWithPagingQuery extends PagingQuery {
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
