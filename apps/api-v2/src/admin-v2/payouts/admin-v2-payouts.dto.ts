import { Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { type AdminV2EscalatePayoutBody } from '@remoola/api-types';

import { optionalNumberQuery, optionalStringQuery } from '../../common/query';
import { ConfirmedVersionedMutationBody } from '../admin-v2-common.dto';

export class PayoutsListQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class EscalatePayoutBody extends ConfirmedVersionedMutationBody implements AdminV2EscalatePayoutBody {
  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}
