import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

import {
  CONSUMER_APP_SCOPES,
  type AdminV2AddConsumerFlagBody,
  type AdminV2CreateConsumerNoteBody,
  type AdminV2ForceLogoutConsumerBody,
  type AdminV2RemoveConsumerFlagBody,
  type AdminV2ResendConsumerEmailBody,
  type AdminV2SuspendConsumerBody,
} from '@remoola/api-types';

import { OptionalStringQuery, PagingQuery, SearchWithPagingQuery } from '../../common';
import { ConfirmedMutationBody, VersionedMutationBody } from '../admin-v2-common.dto';

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class ForceLogoutBody extends ConfirmedMutationBody implements AdminV2ForceLogoutConsumerBody {}

export class SuspendConsumerBody extends ConfirmedMutationBody implements AdminV2SuspendConsumerBody {
  @Expose()
  @IsString()
  reason!: string;
}

export class EmailResendBody implements AdminV2ResendConsumerEmailBody {
  @Expose()
  @IsIn([`signup_verification`, `password_recovery`])
  emailKind!: `signup_verification` | `password_recovery`;

  @Expose()
  @IsIn(CONSUMER_APP_SCOPES)
  appScope!: (typeof CONSUMER_APP_SCOPES)[number];
}

export class AdminConsumersListQuery extends SearchWithPagingQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  accountType?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  contractorKind?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}

export class AdminConsumerDateRangeWithPagingQuery extends PagingQuery {
  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateTo?: Date;
}

export class AdminConsumerActionLogQuery extends AdminConsumerDateRangeWithPagingQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  action?: string;
}

export class ConsumerNoteBody implements AdminV2CreateConsumerNoteBody {
  @Expose()
  @IsString()
  content!: string;
}

export class ConsumerFlagBody implements AdminV2AddConsumerFlagBody {
  @Expose()
  @IsString()
  flag!: string;

  @Expose()
  @IsString()
  @IsOptional()
  reason?: string | null;
}

export class ConsumerFlagRemoveBody extends VersionedMutationBody implements AdminV2RemoveConsumerFlagBody {}
