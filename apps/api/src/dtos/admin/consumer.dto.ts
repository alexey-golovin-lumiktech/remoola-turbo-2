import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IConsumerModel,
  type IConsumerResponse,
  type IConsumerCreate,
  type IConsumerUpdate,
  constants,
} from '../../shared-common';
import { BaseModel } from '../common';

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty({ required: true })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string;

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  verified = false;

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  legalVerified = false;

  @Expose()
  @ApiProperty({ required: false, default: null })
  password?: string = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  salt?: string = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUs?: null | $Enums.HowDidHearAboutUs = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUsOther?: null | string = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.AccountType))
  accountType?: $Enums.AccountType = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.ContractorKind))
  contractorKind?: $Enums.ContractorKind = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeCustomerId?: string = null;
}

export class ConsumerResponse extends OmitType(Consumer, [`deletedAt`] as const) implements IConsumerResponse {}

export class ConsumerListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [ConsumerResponse] })
  @Type(() => ConsumerResponse)
  data: ConsumerResponse[];
}

export class ConsumerCreate
  extends PickType(Consumer, [
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
