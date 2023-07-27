import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEnum, IsNotEmpty } from 'class-validator'

import { LegalStatus } from '@wirebill/shared-common/enums'
import { IPersonalDetailsModel } from '@wirebill/shared-common/models'
import { LegalStatusValue } from '@wirebill/shared-common/types'

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
  @ApiProperty({ enum: Object.values(LegalStatus) })
  @IsNotEmpty()
  @IsEnum(Object.values(LegalStatus))
  legalStatus: LegalStatusValue

  @Expose()
  @ApiProperty({ required: false })
  countryOfTaxResidence?: string

  @Expose()
  @ApiProperty({ required: false })
  taxId?: string

  @Expose()
  @ApiProperty({ required: false })
  phoneNumber?: string
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
