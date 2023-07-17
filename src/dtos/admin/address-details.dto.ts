import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IAddressDetailsUpdate } from '@wirebill/shared-common/dtos'
import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class AddressDetails extends BaseModel implements IAddressDetailsModel {
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

export class AddressDetailsResponse extends OmitType(AddressDetails, [`deletedAt`] as const) {}

export class UpdateAddressDetails implements IAddressDetailsUpdate {
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
