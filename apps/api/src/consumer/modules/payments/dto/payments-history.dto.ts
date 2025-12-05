import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class PaymentsHistoryQueryDto {
  @ApiPropertyOptional({ enum: $Enums.TransactionActionType })
  @IsEnum($Enums.TransactionActionType)
  @IsOptional()
  actionType?: $Enums.TransactionActionType;

  @ApiPropertyOptional({ enum: $Enums.TransactionStatus })
  @IsEnum($Enums.TransactionStatus)
  @IsOptional()
  status?: $Enums.TransactionStatus;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
