import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'

import * as CommonDTOS from '../common'

import { adminType, adminTypes } from 'src/models'
import { ValueOf } from 'src/shared-types'

export class Access extends CommonDTOS.Access {
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
  @ApiProperty({ enum: adminTypes })
  @IsIn(adminTypes)
  type: ValueOf<typeof adminType>
}
