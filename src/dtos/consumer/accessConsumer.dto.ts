import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { Access, IAccess } from '../common'

export interface IAccessConsumer extends IAccess {
  refreshToken: string | null
}

export class AccessConsumer extends Access implements IAccessConsumer {
  @Expose()
  @ApiProperty({ example: `refresh-token-string or null` })
  refreshToken: string
}
