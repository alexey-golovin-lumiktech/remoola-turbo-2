import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  @ApiProperty({ description: `Consumer email address (used for authentication)`, required: true })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string;

  @Expose()
  @ApiProperty({ description: `Email verification status`, required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  verified = false;

  @Expose()
  @ApiProperty({ description: `Legal identity verification status (KYC/KYB)`, required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  legalVerified = false;

  @Expose()
  @ApiProperty({
    description: `Current verification status (PENDING, VERIFIED, REJECTED)`,
    required: false,
    default: `PENDING`,
  })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.VerificationStatus))
  verificationStatus?: $Enums.VerificationStatus = $Enums.VerificationStatus.PENDING;

  @Expose()
  @ApiProperty({
    description: `Reason for verification status change (e.g., rejection reason)`,
    required: false,
    default: null,
  })
  @IsOptional()
  @IsString()
  verificationReason?: string | null = null;

  @Expose()
  @ApiProperty({ description: `Timestamp of last verification update`, required: false, default: null })
  verificationUpdatedAt?: Date | null = null;

  @Expose()
  @ApiProperty({
    description: `Admin user ID who performed the last verification update`,
    required: false,
    default: null,
  })
  verificationUpdatedBy?: string | null = null;

  @Expose()
  @ApiProperty({
    description: `Bcrypt-hashed password (write-only, never returned in responses)`,
    required: false,
    default: null,
  })
  password?: string = null;

  @Expose()
  @ApiProperty({
    description: `Password salt for bcrypt hashing (write-only, never returned in responses)`,
    required: false,
    default: null,
  })
  salt?: string = null;

  @Expose()
  @ApiProperty({ description: `How the consumer learned about Remoola`, required: false, default: null })
  howDidHearAboutUs?: null | $Enums.HowDidHearAboutUs = null;

  @Expose()
  @ApiProperty({ description: `Custom text if howDidHearAboutUs is "Other"`, required: false, default: null })
  howDidHearAboutUsOther?: null | string = null;

  @Expose()
  @ApiProperty({ description: `Account type (BUSINESS or CONTRACTOR)`, required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.AccountType))
  accountType?: $Enums.AccountType = null;

  @Expose()
  @ApiProperty({ description: `Contractor kind (specific contractor classification)`, required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.ContractorKind))
  contractorKind?: $Enums.ContractorKind = null;

  @Expose()
  @ApiProperty({ description: `Stripe customer ID for payment processing`, required: false, default: null })
  stripeCustomerId?: string = null;
}

export class ConsumerResponse extends OmitType(Consumer, [`deletedAt`] as const) implements IConsumerResponse {}

export class ConsumerListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of consumers in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of consumer records`, required: true, type: [ConsumerResponse] })
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
