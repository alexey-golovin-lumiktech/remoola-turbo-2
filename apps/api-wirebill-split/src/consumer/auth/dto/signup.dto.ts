import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

import { $Enums, type Consumer as IConsumer } from '@remoola/database';

import { OptionalNullableString } from '../../../common';

class Consumer implements IConsumer {
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
  @ApiProperty()
  firstName: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty({ enum: $Enums.AccountType })
  accountType: $Enums.AccountType;

  @Expose()
  @ApiProperty({ enum: $Enums.ContractorKind })
  contractorKind: $Enums.ContractorKind;

  @Expose()
  @ApiProperty()
  howDidHearAboutUs: string;

  @Expose()
  @ApiProperty()
  stripeCustomerId: string;
}

export class SignupBody extends PickType(Consumer, [
  `email`, //
  `password`,
  `accountType`,
  `howDidHearAboutUs`,
] as const) {
  @Expose()
  @ApiPropertyOptional()
  @OptionalNullableString()
  firstName?: string;

  @Expose()
  @ApiPropertyOptional()
  @OptionalNullableString()
  lastName?: string;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.ContractorKind })
  @OptionalNullableString()
  contractorKind?: $Enums.ContractorKind;
}
