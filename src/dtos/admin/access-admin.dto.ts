import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'

import type { AdminTypeValue } from '../../shared-types/common.types'
import { AdminType } from '../../shared-types/enum-like'

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
