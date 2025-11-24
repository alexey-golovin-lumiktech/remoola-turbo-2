import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

import { $Enums, type ConsumerModel } from '@remoola/database';

import { OptionalNullableString } from '../../../common';

class ConsumerDTO implements ConsumerModel {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiProperty()
  deletedAt: Date;

  @Expose()
  @ApiProperty()
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty()
  verified: boolean;

  @Expose()
  @ApiProperty()
  legalVerified: boolean;

  @Expose()
  @ApiProperty()
  @IsString()
  password: string;

  @Expose()
  @ApiProperty()
  salt: string;

  @Expose()
  @ApiProperty({ enum: $Enums.AccountType })
  accountType: $Enums.AccountType;

  @Expose()
  @ApiProperty({ enum: $Enums.ContractorKind })
  contractorKind: $Enums.ContractorKind;

  @Expose()
  @ApiProperty()
  howDidHearAboutUs: null | $Enums.HowDidHearAboutUs;

  @Expose()
  @ApiProperty()
  howDidHearAboutUsOther: null | string;

  @Expose()
  @ApiProperty()
  stripeCustomerId: string;
}

export class SignupBody extends PickType(ConsumerDTO, [
  `email`, //
  `password`,
  `accountType`,
  `howDidHearAboutUs`,
  `howDidHearAboutUsOther`,
] as const) {
  @Expose()
  @ApiPropertyOptional({ enum: $Enums.ContractorKind })
  @OptionalNullableString()
  contractorKind?: $Enums.ContractorKind;
}
