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

import { constants } from '../../shared-common';

export class InviteAdminBody {
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

export class VersionedAdminMutationBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

export class DeactivateAdminBody extends VersionedAdminMutationBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangeAdminRoleBody extends VersionedAdminMutationBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  roleKey!: string;
}

export class PermissionOverride {
  @Expose()
  @IsString()
  capability!: string;

  @Expose()
  @IsString()
  @IsIn([`inherit`, `grant`, `deny`])
  mode!: `inherit` | `grant` | `deny`;
}

export class ChangeAdminPermissionsBody extends VersionedAdminMutationBody {
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

export class AdminPasswordPatchBody {
  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

export class LegacyAdminStatusBody {
  @Expose()
  @IsIn([`delete`, `restore`])
  action!: `delete` | `restore`;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  passwordConfirmation?: string;
}
