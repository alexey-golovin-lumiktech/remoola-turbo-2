import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'

import { adminType, adminTypes } from '../../models'
import { ValueOf } from '../../shared-types'
import { IAccessRefresh } from '../common'

export type IAccessAdmin = IAccessRefresh & { type: ValueOf<typeof adminType> }

export class AccessAdmin implements IAccessAdmin {
  @Expose()
  @ApiProperty({ example: `access-token-string`, default: null })
  @IsString()
  @IsNotEmpty()
  accessToken: string

  @Expose()
  @ApiProperty({ example: `access-token-string`, default: null })
  @IsString()
  @IsNotEmpty()
  refreshToken: string

  @Expose()
  @ApiProperty({ enum: adminTypes })
  @IsIn(adminTypes)
  type: ValueOf<typeof adminType>
}
