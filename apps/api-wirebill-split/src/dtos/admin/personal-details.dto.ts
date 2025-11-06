import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ValidateIf } from 'class-validator';

import { LegalStatus } from '@remoola/database';

import { IPersonalDetailsModel, IPersonalDetailsUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class PersonalDetails extends BaseModel implements IPersonalDetailsModel {
  @Expose()
  @ApiProperty()
  citizenOf: string;

  @Expose()
  @ApiProperty()
  dateOfBirth: string;

  @Expose()
  @ApiProperty()
  passportOrIdNumber: string;

  @Expose()
  @ApiProperty({ enum: Object.values(LegalStatus), required: false })
  @ValidateIf(({ value }) => value != null)
  legalStatus?: LegalStatus;

  @Expose()
  @ApiProperty({ required: false })
  countryOfTaxResidence?: string;

  @Expose()
  @ApiProperty({ required: false })
  taxId?: string;

  @Expose()
  @ApiProperty({ required: false })
  phoneNumber?: string;
}

export class PersonalDetailsResponse extends OmitType(PersonalDetails, [`deletedAt`] as const) {}

export class PersonalDetailsListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [PersonalDetailsResponse] })
  @Type(() => PersonalDetailsResponse)
  data: PersonalDetailsResponse[];
}

export class UpdatePersonalDetails
  extends PickType(PersonalDetails, [
    `citizenOf`,
    `dateOfBirth`,
    `passportOrIdNumber`,
    `legalStatus`,
    `countryOfTaxResidence`,
    `taxId`,
    `phoneNumber`,
  ] as const)
  implements IPersonalDetailsUpdate {}
