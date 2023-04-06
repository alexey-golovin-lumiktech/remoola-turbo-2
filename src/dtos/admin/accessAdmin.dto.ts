import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEnum } from 'class-validator'
import { AdminType } from 'src/models'
import { Access, IAccess } from '../common'

export interface IAccessAdmin extends IAccess {
  type: AdminType
}

export class AccessAdmin extends Access implements IAccessAdmin {
  @Expose()
  @ApiProperty({ enum: AdminType })
  @IsEnum(AdminType)
  type: AdminType
}
