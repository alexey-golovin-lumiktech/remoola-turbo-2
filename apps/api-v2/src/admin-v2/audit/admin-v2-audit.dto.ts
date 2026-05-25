import { Expose, Transform } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

import { PagingQuery } from '../../common';

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class AuthAuditWithPagingQuery extends PagingQuery {
  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  @IsOptional()
  dateTo?: Date;

  @Expose()
  @IsString()
  @IsOptional()
  email?: string;

  @Expose()
  @IsString()
  @IsOptional()
  event?: string;

  @Expose()
  @IsString()
  @IsOptional()
  ipAddress?: string;
}

export class AdminActionAuditWithPagingQuery extends PagingQuery {
  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  @IsOptional()
  dateTo?: Date;

  @Expose()
  @IsString()
  @IsOptional()
  action?: string;

  @Expose()
  @IsString()
  @IsOptional()
  adminId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  email?: string;

  @Expose()
  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class ConsumerActionAuditWithPagingQuery extends PagingQuery {
  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  dateFrom!: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsDate()
  @IsOptional()
  dateTo?: Date;

  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  action?: string;
}
