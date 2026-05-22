import { Expose } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { type AdminV2PaymentReversalBody } from '@remoola/api-types';

import {
  CursorLimitQuery,
  OptionalBooleanQuery,
  OptionalDateQuery,
  OptionalNumberQuery,
  OptionalStringQuery,
} from '../../common';

export class PaymentRequestsQuery extends CursorLimitQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  status?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  paymentRail?: string;

  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @Expose()
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  amountMin?: number;

  @Expose()
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  amountMax?: number;

  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  dueDateFrom?: Date;

  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  dueDateTo?: Date;

  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  createdFrom?: Date;

  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  createdTo?: Date;

  @Expose()
  @OptionalBooleanQuery()
  @IsOptional()
  @IsBoolean()
  overdue?: boolean;
}

export class PaymentReversalBody implements AdminV2PaymentReversalBody {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}
