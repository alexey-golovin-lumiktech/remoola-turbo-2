import { Expose, Transform, Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class AuthAuditQuery {
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

export class AdminActionAuditQuery {
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

export class ConsumerActionAuditQuery {
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
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  action?: string;
}
