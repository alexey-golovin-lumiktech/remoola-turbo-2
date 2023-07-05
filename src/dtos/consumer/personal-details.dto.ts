import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common/base-model.dto'

class PersonalDetails extends BaseModel implements IPersonalDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  citizenOf: string

  @Expose()
  @ApiProperty()
  dateOfBirth: Date

  @Expose()
  @ApiProperty()
  passportOrIdNumber: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  countryOfTaxResidence?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  legalStatus?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  taxId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  phoneNumber?: string = null
}

export class PersonalDetailsResponse extends OmitType(PersonalDetails, [`deletedAt`] as const) {}
export class CreatePersonalDetails extends PickType(PersonalDetailsResponse, [
  `consumerId`,
  `citizenOf`,
  `dateOfBirth`,
  `passportOrIdNumber`,
  `countryOfTaxResidence`,
  `legalStatus`,
  `taxId`,
  `phoneNumber`,
] as const) {}

export class UpdatePersonalDetails extends PickType(PersonalDetailsResponse, [
  `consumerId`,
  `citizenOf`,
  `dateOfBirth`,
  `passportOrIdNumber`,
  `countryOfTaxResidence`,
  `legalStatus`,
  `taxId`,
  `phoneNumber`,
] as const) {}
