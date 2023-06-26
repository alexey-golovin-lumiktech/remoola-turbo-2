import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'

import { AdminType, AdminTypeValue } from '../../shared-types'

export class Access {
  @Expose()
  @ApiProperty({ example: `access-token-string` })
  @IsString()
  @IsNotEmpty()
  accessToken: string

  @Expose()
  @ApiProperty({ example: `access-token-string` })
  @IsString()
  @IsNotEmpty()
  refreshToken: string

  @Expose()
  @ApiProperty({ enum: Object.values(AdminType) })
  @IsIn(Object.values(AdminType))
  type: AdminTypeValue
}
