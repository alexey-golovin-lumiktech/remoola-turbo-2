import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { $Enums, type PersonalDetails as IPersonalDetails } from '@remoola/database';

import { OptionalNullableString } from '../../../common';
import { toNativeDate } from '../../../shared-common';

class PersonalDetails implements IPersonalDetails {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  citizenOf: string;

  @Expose()
  @ApiProperty()
  @Transform(({ value }) => {
    const native = toNativeDate(value);
    if (isNaN(native.getTime())) throw new BadRequestException(`Invalid dateOfBirth value`);
    return native;
  })
  dateOfBirth: Date;

  @Expose()
  @ApiProperty()
  passportOrIdNumber: string;

  @Expose()
  @ApiProperty()
  phoneNumber: string;

  @Expose()
  @ApiProperty({ enum: $Enums.LegalStatus })
  legalStatus: $Enums.LegalStatus;

  @Expose()
  @ApiProperty()
  countryOfTaxResidence: string;

  @Expose()
  @ApiProperty()
  taxId: string;

  @Expose()
  @ApiProperty()
  consumerId: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiProperty()
  deletedAt: Date;
}

export class PersonalDetailsUpsert extends PickType(PersonalDetails, [
  `citizenOf`,
  `dateOfBirth`,
  `passportOrIdNumber`,
  `countryOfTaxResidence`,
  `taxId`,
  `phoneNumber`,
] as const) {
  @Expose()
  @ApiPropertyOptional({ enum: $Enums.LegalStatus })
  @OptionalNullableString()
  legalStatus?: $Enums.LegalStatus;
}

export class PersonalDetailsUpsertOkResponse {
  @Expose()
  @ApiProperty()
  personalDetailsId: string;
}
