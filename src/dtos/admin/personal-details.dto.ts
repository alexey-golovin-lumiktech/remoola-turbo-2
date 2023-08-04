import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { ValidateIf } from 'class-validator'

import { IPersonalDetailsUpdate } from '@wirebill/shared-common/dtos'
import { LegalStatus } from '@wirebill/shared-common/enums'
import { IPersonalDetailsModel } from '@wirebill/shared-common/models'
import { LegalStatusValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

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
  @ValidateIf(({ value }) => value != null)
  legalStatus?: LegalStatusValue

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

export class UpdatePersonalDetails implements IPersonalDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  citizenOf: string

  @Expose()
  @ApiProperty({ required: false })
  dateOfBirth: Date

  @Expose()
  @ApiProperty({ required: false })
  passportOrIdNumber: string

  @Expose()
  @ApiProperty({ enum: Object.values(LegalStatus) })
  @ValidateIf(({ value }) => value != null)
  legalStatus?: LegalStatusValue

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
