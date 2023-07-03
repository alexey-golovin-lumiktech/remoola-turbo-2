import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common/base-model.dto'

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
export class CreateAddressDetails extends PickType(AddressDetailsResponse, [
  `consumerId`,
  `street`,
  `city`,
  `region`,
  `zipOrPostalCode`,
] as const) {}

export class UpdateAddressDetails extends PickType(AddressDetailsResponse, [
  `consumerId`,
  `street`,
  `city`,
  `region`,
  `zipOrPostalCode`,
] as const) {}
