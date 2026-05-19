import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import {
  type AdminV2DocumentBulkTagBody,
  type AdminV2DocumentBulkTagResource,
  type AdminV2DocumentRetagBody,
  type AdminV2DocumentTagCreateBody,
  type AdminV2DocumentTagDeleteBody,
  type AdminV2DocumentTagUpdateBody,
} from '@remoola/api-types';

import { ConfirmedVersionedMutationBody, VersionedMutationBody } from '../admin-v2-common.dto';

export class DocumentTagCreateBody implements AdminV2DocumentTagCreateBody {
  @Expose()
  @IsString()
  name!: string;
}

export class DocumentTagUpdateBody extends VersionedMutationBody implements AdminV2DocumentTagUpdateBody {
  @Expose()
  @IsString()
  name!: string;
}

export class DocumentTagDeleteBody extends ConfirmedVersionedMutationBody implements AdminV2DocumentTagDeleteBody {}

export class DocumentRetagBody extends VersionedMutationBody implements AdminV2DocumentRetagBody {
  @Expose()
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}

export class BulkTagResource extends VersionedMutationBody implements AdminV2DocumentBulkTagResource {
  @Expose()
  @IsString()
  resourceId!: string;
}

export class DocumentBulkTagBody implements AdminV2DocumentBulkTagBody {
  @Expose()
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTagResource)
  resources!: BulkTagResource[];
}

export class AdminDocumentsListQuery {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  access?: string;

  @Expose()
  @IsString()
  @IsOptional()
  mimetype?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sizeMin?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sizeMax?: number;

  @Expose()
  @IsString()
  @IsOptional()
  createdFrom?: string;

  @Expose()
  @IsString()
  @IsOptional()
  createdTo?: string;

  @Expose()
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  tag?: string;

  @Expose()
  @IsString()
  @IsOptional()
  tagId?: string;

  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}
