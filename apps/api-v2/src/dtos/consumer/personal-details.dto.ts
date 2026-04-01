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
  @ApiProperty({ description: `Country of citizenship (ISO 3166-1 alpha-2 country code)` })
  citizenOf: string;

  @Expose()
  @ApiProperty({ description: `Date of birth (ISO 8601 date format)` })
  dateOfBirth: string;

  @Expose()
  @ApiProperty({ description: `Passport or national ID number for identity verification` })
  passportOrIdNumber: string;

  @Expose()
  @ApiProperty({
    description: `Legal status (e.g., CITIZEN, RESIDENT, NON_RESIDENT)`,
    required: false,
    enum: Object.values($Enums.LegalStatus),
  })
  @ValidateIf(({ value }) => value != null)
  legalStatus?: $Enums.LegalStatus;

  @Expose()
  @ApiProperty({ description: `Country of tax residence (ISO 3166-1 alpha-2)`, required: false })
  countryOfTaxResidence?: string;

  @Expose()
  @ApiProperty({ description: `Tax identification number (TIN, SSN, NIF, etc.)`, required: false })
  taxId?: string;

  @Expose()
  @ApiProperty({ description: `Contact phone number in E.164 format`, required: false })
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
