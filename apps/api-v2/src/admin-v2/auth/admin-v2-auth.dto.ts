import { Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import {
  type AdminV2RequestPasswordResetBody,
  type AdminV2RevokeAdminSessionBody,
  type AdminV2TokenPasswordBody,
} from '@remoola/api-types';

import { constants } from '../../shared-common';

export class RevokeAdminSessionBody implements AdminV2RevokeAdminSessionBody {
  @Expose()
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class AcceptAdminInvitationBody implements AdminV2TokenPasswordBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

export class ResetAdminV2PasswordBody implements AdminV2TokenPasswordBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

export class RequestAdminV2PasswordResetBody implements AdminV2RequestPasswordResetBody {
  @Expose()
  @IsString()
  @IsEmail()
  email!: string;
}
