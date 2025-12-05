import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class PaymentsHistoryQueryDto {
  @Expose()
  @ApiPropertyOptional({ enum: $Enums.TransactionActionType })
  @IsEnum($Enums.TransactionActionType)
  @IsOptional()
  actionType?: $Enums.TransactionActionType;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.TransactionStatus })
  @IsEnum($Enums.TransactionStatus)
  @IsOptional()
  status?: $Enums.TransactionStatus;

  @Expose()
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
