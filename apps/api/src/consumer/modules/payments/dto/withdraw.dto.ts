import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNumber, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class WithdrawDto {
  @Expose()
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @Expose()
  @ApiProperty({ enum: $Enums.PaymentMethodType })
  @IsEnum($Enums.PaymentMethodType)
  method!: $Enums.PaymentMethodType;
}
