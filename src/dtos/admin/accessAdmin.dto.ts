import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn } from 'class-validator'
import { adminType, adminTypes } from 'src/models'
import { Access, IAccess } from '../common'

export interface IAccessAdmin extends IAccess {
  type: ValueOf<typeof adminType>
}

export class AccessAdmin extends Access implements IAccessAdmin {
  @Expose()
  @ApiProperty({ enum: adminTypes })
  @IsIn(adminTypes)
  type: ValueOf<typeof adminType>
}
