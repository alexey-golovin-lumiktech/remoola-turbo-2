import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import {
  type AdminV2DisablePaymentMethodBody,
  type AdminV2DuplicateEscalatePaymentMethodBody,
  type AdminV2RemoveDefaultPaymentMethodBody,
} from '@remoola/api-types';

import { optionalBooleanQuery, optionalNumberQuery, optionalStringQuery } from '../../common/query-transforms';
import { ConfirmedVersionedMutationBody, VersionedMutationBody } from '../admin-v2-common.dto';

export class PaymentMethodsListQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  defaultSelected?: boolean;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  fingerprint?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}

export class DisablePaymentMethodBody
  extends ConfirmedVersionedMutationBody
  implements AdminV2DisablePaymentMethodBody
{
  @Expose()
  @IsString()
  reason!: string;
}

export class RemoveDefaultPaymentMethodBody
  extends VersionedMutationBody
  implements AdminV2RemoveDefaultPaymentMethodBody {}

export class DuplicateEscalatePaymentMethodBody
  extends VersionedMutationBody
  implements AdminV2DuplicateEscalatePaymentMethodBody {}
