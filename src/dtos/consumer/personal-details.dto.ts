import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { ValidateIf } from 'class-validator'

import { IPersonalDetailsCreate, IPersonalDetailsUpdate } from '@wirebill/shared-common/dtos'
import { LegalStatus } from '@wirebill/shared-common/enums'
import { IPersonalDetailsModel } from '@wirebill/shared-common/models'
import { LegalStatusValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common/base-model.dto'

class PersonalDetails extends BaseModel implements IPersonalDetailsModel {
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
  @ApiProperty({ enum: Object.values(LegalStatus), required: false })
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
export class PersonalDetailsCreate
  extends PickType(PersonalDetails, [
    `citizenOf`,
    `dateOfBirth`,
    `passportOrIdNumber`,
    `countryOfTaxResidence`,
    `legalStatus`,
    `taxId`,
    `phoneNumber`,
  ] as const)
  implements IPersonalDetailsCreate {}

export class PersonalDetailsUpdate extends PartialType(PersonalDetailsCreate) implements IPersonalDetailsUpdate {}
