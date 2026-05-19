import { Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import { constants } from '../../shared-common';

export class RevokeAdminSessionBody {
  @Expose()
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class AcceptAdminInvitationBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

export class ResetAdminV2PasswordBody {
  @Expose()
  @IsString()
  token!: string;

  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;
}

export class RequestAdminV2PasswordResetBody {
  @Expose()
  @IsString()
  @IsEmail()
  email!: string;
}
