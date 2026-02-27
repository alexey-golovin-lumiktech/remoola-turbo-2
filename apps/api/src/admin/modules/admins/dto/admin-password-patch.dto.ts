import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

import { constants } from '../../../../shared-common';

export class AdminPasswordPatchBody {
  @Expose()
  @ApiProperty({ description: `New password for the admin` })
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;

  @Expose()
  @ApiProperty({ description: `Current admin password (step-up confirmation)` })
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}
