import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { type AdminV2ApproveRateBody } from '@remoola/api-types';

import { OptionalStringQuery, PaginationQueryDto, SearchPaginationQueryDto } from '../../common';
import {
  StepUpConfirmedVersionedMutationBody,
  StepUpVersionedMutationBody,
  VersionedMutationBody,
} from '../admin-v2-common.dto';

function optionalLooseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === `true`) return true;
  if (value === false || value === `false`) return false;
  return undefined;
}

export class VersionBody extends VersionedMutationBody {}

export class StepUpVersionBody extends StepUpVersionedMutationBody {}

export class ConfirmedVersionBody extends StepUpConfirmedVersionedMutationBody {}

export class ApproveRateBody extends ConfirmedVersionBody implements AdminV2ApproveRateBody {
  @Expose()
  @IsString()
  reason!: string;
}

export class ExchangeListRatesQuery extends PaginationQueryDto {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  fromCurrency?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  toCurrency?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  provider?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  status?: string;

  @Expose()
  @Transform(({ value }) => optionalLooseBoolean(value))
  @IsBoolean()
  @IsOptional()
  stale?: boolean;
}

export class ExchangeListRulesQuery extends SearchPaginationQueryDto {
  @Expose()
  @Transform(({ value }) => optionalLooseBoolean(value))
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  fromCurrency?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  toCurrency?: string;
}

export class ExchangeListScheduledConversionsQuery extends SearchPaginationQueryDto {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  status?: string;
}
