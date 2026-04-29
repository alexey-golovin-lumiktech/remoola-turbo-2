import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsIn, ValidateIf } from 'class-validator';

import { $Enums, type ConsumerModel } from '@remoola/database-2';

import { constants, type IConsumerCreate, type IConsumerUpdate, IsValidEmail } from '../../shared-common';
import { BaseModel } from '../common';

export class Consumer extends BaseModel implements ConsumerModel {
  @Expose()
  @ApiProperty({ description: `Consumer email address (used for authentication)`, required: true })
  @IsValidEmail({ message: constants.INVALID_EMAIL })
  email: string;

  @Expose()
  @ApiProperty({ description: `Email verification status`, required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  verified;

  @Expose()
  @ApiProperty({ description: `Legal identity verification status (KYC/KYB)`, required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  legalVerified;

  @Expose()
  @ApiProperty({
    description: `Bcrypt-hashed password (write-only, never returned in responses)`,
    required: false,
    default: null,
  })
  password: string;

  @Expose()
  @ApiProperty({
    description: `Password salt for bcrypt hashing (write-only, never returned in responses)`,
    required: false,
    default: null,
  })
  salt: string;

  @Expose()
  @ApiProperty({ description: `How the consumer learned about Remoola`, required: false, default: null })
  howDidHearAboutUs: null | $Enums.HowDidHearAboutUs;

  @Expose()
  @ApiProperty({ description: `Custom text if howDidHearAboutUs is "Other"`, required: false, default: null })
  howDidHearAboutUsOther: null | string;

  @Expose()
  @ApiProperty({ description: `Account type (BUSINESS or CONTRACTOR)`, required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.AccountType))
  accountType: $Enums.AccountType;

  @Expose()
  @ApiProperty({ description: `Contractor kind (specific contractor classification)`, required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.ContractorKind))
  contractorKind: $Enums.ContractorKind;

  @Expose()
  @ApiProperty({ description: `Stripe customer ID for payment processing`, required: false, default: null })
  stripeCustomerId: string;

  @Expose()
  @ApiProperty({ description: `Current verification status (PENDING, VERIFIED, REJECTED)`, required: false })
  verificationStatus: $Enums.VerificationStatus;

  @Expose()
  @ApiProperty({ description: `Reason for verification status change (e.g., rejection reason)`, required: false })
  verificationReason: string;

  @Expose()
  @ApiProperty({ description: `Timestamp of last verification update`, required: false })
  verificationUpdatedAt: Date;

  @Expose()
  @ApiProperty({ description: `Admin user ID who performed the last verification update`, required: false })
  verificationUpdatedBy: string;

  @Expose()
  @ApiProperty({ description: `Timestamp when the consumer was suspended`, required: false, default: null })
  suspendedAt: Date;

  @Expose()
  @ApiProperty({ description: `Admin user ID who applied suspension`, required: false, default: null })
  suspendedBy: string;

  @Expose()
  @ApiProperty({ description: `Recorded reason for consumer suspension`, required: false, default: null })
  suspensionReason: string;

  @Expose()
  @ApiProperty({ description: `Current Stripe Identity lifecycle status`, required: false, default: null })
  stripeIdentityStatus: string;

  @Expose()
  @ApiProperty({ description: `Current Stripe Identity session id`, required: false, default: null })
  stripeIdentitySessionId: string;

  @Expose()
  @ApiProperty({ description: `Last Stripe Identity error code`, required: false, default: null })
  stripeIdentityLastErrorCode: string;

  @Expose()
  @ApiProperty({ description: `Last Stripe Identity error reason`, required: false, default: null })
  stripeIdentityLastErrorReason: string;

  @Expose()
  @ApiProperty({ description: `Timestamp when the current Stripe Identity flow started`, required: false })
  stripeIdentityStartedAt: Date;

  @Expose()
  @ApiProperty({ description: `Timestamp when Stripe Identity state last changed`, required: false })
  stripeIdentityUpdatedAt: Date;

  @Expose()
  @ApiProperty({ description: `Timestamp when Stripe Identity was verified`, required: false })
  stripeIdentityVerifiedAt: Date;
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
