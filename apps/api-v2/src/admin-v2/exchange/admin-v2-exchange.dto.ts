import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import {
  type AdminV2ApproveRateBody,
  type AdminV2CancelScheduledExchangeBody,
  type AdminV2ForceExecuteScheduledExchangeBody,
  type AdminV2PauseExchangeRuleBody,
  type AdminV2ResumeExchangeRuleBody,
  type AdminV2RunExchangeRuleBody,
} from '@remoola/api-types';

import { OptionalStringQuery, PagingQuery, SearchWithPagingQuery } from '../../common';
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

class VersionBody extends VersionedMutationBody {}

class StepUpVersionBody extends StepUpVersionedMutationBody {}

class ConfirmedVersionBody extends StepUpConfirmedVersionedMutationBody {}

export class PauseExchangeRuleBody extends VersionBody implements AdminV2PauseExchangeRuleBody {}

export class ResumeExchangeRuleBody extends VersionBody implements AdminV2ResumeExchangeRuleBody {}

export class RunExchangeRuleBody extends StepUpVersionBody implements AdminV2RunExchangeRuleBody {}

export class ForceExecuteScheduledExchangeBody
  extends ConfirmedVersionBody
  implements AdminV2ForceExecuteScheduledExchangeBody {}

export class CancelScheduledExchangeBody extends ConfirmedVersionBody implements AdminV2CancelScheduledExchangeBody {}

export class ApproveRateBody extends ConfirmedVersionBody implements AdminV2ApproveRateBody {
  @Expose()
  @IsString()
  reason!: string;
}

export class ExchangeListRatesWithPagingQuery extends PagingQuery {
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

export class ExchangeListRulesQuery extends SearchWithPagingQuery {
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

export class ExchangeListScheduledConversionsQuery extends SearchWithPagingQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  status?: string;
}
