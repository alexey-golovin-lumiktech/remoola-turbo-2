import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IPersonalDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

export class PersonalDetails extends BaseModel implements IPersonalDetailsModel {
  @Expose()
  @ApiProperty()
  citizenOf: string

  @Expose()
  @ApiProperty()
  countryOfTaxResidence: string

  @Expose()
  @ApiProperty()
  legalStatus: string

  @Expose()
  @ApiProperty()
  taxId: string

  @Expose()
  @ApiProperty()
  dateOfBirth: string

  @Expose()
  @ApiProperty()
  passportOrIdNumber: string

  @Expose()
  @ApiProperty()
  phoneNumber: string
}
