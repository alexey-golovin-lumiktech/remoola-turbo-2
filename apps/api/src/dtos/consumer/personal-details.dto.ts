import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IPersonalDetailsCreate,
  type IPersonalDetailsModel,
  type IPersonalDetailsUpdate,
} from '../../shared-common';
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
  @ApiProperty({ enum: Object.values($Enums.LegalStatus), required: false })
  @ValidateIf(({ value }) => value != null)
  legalStatus?: $Enums.LegalStatus;

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
