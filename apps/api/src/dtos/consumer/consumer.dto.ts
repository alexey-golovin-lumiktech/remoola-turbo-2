import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator';

import { $Enums, type ConsumerModel } from '@remoola/database-2';

import { constants, type IConsumerCreate, type IConsumerUpdate } from '../../shared-common';
import { BaseModel } from '../common';

export class ConsumerDTO extends BaseModel implements ConsumerModel {
  @Expose()
  @ApiProperty({ required: true })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string;

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  verified;

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  legalVerified;

  @Expose()
  @ApiProperty({ required: false, default: null })
  password: string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  salt: string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUs: null | $Enums.HowDidHearAboutUs;

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUsOther: null | string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.AccountType))
  accountType: $Enums.AccountType;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.ContractorKind))
  contractorKind: $Enums.ContractorKind;

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeCustomerId: string;

  @Expose()
  @ApiProperty({ required: false })
  verificationStatus: $Enums.VerificationStatus;

  @Expose()
  @ApiProperty({ required: false })
  verificationReason: string;

  @Expose()
  @ApiProperty({ required: false })
  verificationUpdatedAt: Date;

  @Expose()
  @ApiProperty({ required: false })
  verificationUpdatedBy: string;
}

export class ConsumerCreate
  extends PickType(ConsumerDTO, [
    `email`,
    `verified`,
    `legalVerified`,
    `password`,
    `salt`,
    `howDidHearAboutUs`,
    `accountType`,
    `contractorKind`,
  ] as const)
  implements IConsumerCreate {}

export class ConsumerUpdate extends PartialType(ConsumerCreate) implements IConsumerUpdate {}
