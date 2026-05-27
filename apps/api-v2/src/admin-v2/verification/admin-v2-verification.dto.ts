import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { type AdminV2VerificationDecisionBody } from '@remoola/api-types';

import { PagingQuery } from '../../common';
import { optionalBooleanQuery, optionalStringQuery } from '../../common/query';
import { ConfirmedVersionedMutationBody } from '../admin-v2-common.dto';

export class VerificationQueueWithPagingQuery extends PagingQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  stripeIdentityStatus?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  country?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  contractorKind?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  missingProfileData?: boolean;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  missingDocuments?: boolean;
}

export class VerificationDecisionBody
  extends ConfirmedVersionedMutationBody
  implements AdminV2VerificationDecisionBody
{
  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}
