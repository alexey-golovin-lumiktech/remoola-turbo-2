import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IPersonalDetailsModel } from '../../models'
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
  dateOfBirth: string

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

export class CreatePersonalDetails extends PickType(PersonalDetails, [
  `consumerId`,
  `citizenOf`,
  `dateOfBirth`,
  `passportOrIdNumber`,
  `countryOfTaxResidence`,
  `legalStatus`,
  `taxId`,
  `phoneNumber`,
] as const) {}

export class UpdatePersonalDetails extends PickType(PersonalDetails, [
  `consumerId`,
  `citizenOf`,
  `dateOfBirth`,
  `passportOrIdNumber`,
  `countryOfTaxResidence`,
  `legalStatus`,
  `taxId`,
  `phoneNumber`,
] as const) {}

export class PersonalDetailsResponse extends PersonalDetails {}
