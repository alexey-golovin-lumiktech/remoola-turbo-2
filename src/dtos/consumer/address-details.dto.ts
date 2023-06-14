import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IAddressDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

export class AddressDetails extends BaseModel implements IAddressDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  street: string

  @Expose()
  @ApiProperty()
  city: string

  @Expose()
  @ApiProperty()
  region: string

  @Expose()
  @ApiProperty()
  zipOrPostalCode: string
}
