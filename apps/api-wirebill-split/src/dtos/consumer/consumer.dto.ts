import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator';

import { AccountType, ContractorKind, IConsumerModel } from '@remoola/database';

import { constants, HowDidHearAboutUsValue, IConsumerCreate, IConsumerUpdate } from '../../shared-common';
import { BaseModel } from '../common';

export class ConsumerModel extends BaseModel implements IConsumerModel {
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
  firstName: string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  lastName: string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUs: string | HowDidHearAboutUsValue;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(AccountType))
  accountType: AccountType;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(ContractorKind))
  contractorKind: ContractorKind;

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeCustomerId: string;
}

export class ConsumerCreate
  extends PickType(ConsumerModel, [
    `email`,
    `verified`,
    `legalVerified`,
    `password`,
    `salt`,
    `firstName`,
    `lastName`,
    `howDidHearAboutUs`,
    `accountType`,
    `contractorKind`,
  ] as const)
  implements IConsumerCreate {}

export class ConsumerUpdate extends PartialType(ConsumerCreate) implements IConsumerUpdate {}
