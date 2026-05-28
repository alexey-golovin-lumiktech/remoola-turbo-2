import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { type AdminV2AuthOkResponse, type AdminV2LoginBody } from '@remoola/api-types';

import { type EmailPasswordCredentials, constants, IsValidEmail } from '../shared-common';

export class BackofficeCredentials implements EmailPasswordCredentials, AdminV2LoginBody {
  @Expose()
  @IsValidEmail({ message: constants.INVALID_EMAIL })
  @ApiProperty({ example: `regular.admin@wirebill.com` })
  email: string;

  @Expose()
  @IsString({ message: constants.INVALID_PASSWORD })
  @IsNotEmpty({ message: constants.INVALID_PASSWORD })
  @ApiProperty({ example: `RegularWirebill@Admin123!` })
  password: string;
}

export class BackofficeAccess implements AdminV2AuthOkResponse {
  @Expose()
  @ApiProperty({ description: `Cookie-backed admin session was established successfully`, example: true })
  @IsNotEmpty()
  ok: true;
}
