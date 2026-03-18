import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import { IsValidEmail } from '../../../../shared-common';

export class StartPayment {
  @Expose()
  @ApiProperty()
  @IsValidEmail()
  email: string;

  @Expose()
  @ApiProperty()
  @IsNumberString()
  amount: string;

  @Expose()
  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @ApiProperty()
  @IsEnum($Enums.PaymentMethodType)
  method: $Enums.PaymentMethodType;
}
