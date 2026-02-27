import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class AdminAuditAuthQueryDto {
  @ApiPropertyOptional({ description: `Filter by admin email` })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: `Start date (ISO)` })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: `End date (ISO)` })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: `Page number`, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: `Page size`, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 20;
}
