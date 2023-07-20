import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator'

import { IChangePasswordBody, IChangePasswordParam } from '@wirebill/shared-common/dtos'

export class ChangePasswordBody implements IChangePasswordBody {
  @Expose()
  @ApiProperty()
  @IsEmail()
  @ValidateIf(({ value }) => value != null)
  email?: string = null

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  password?: string = null
}

export class ChangePasswordParam implements IChangePasswordParam {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  token: string
}
