import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IPersonalDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

export class PersonalDetails extends BaseModel implements IPersonalDetailsModel {
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
