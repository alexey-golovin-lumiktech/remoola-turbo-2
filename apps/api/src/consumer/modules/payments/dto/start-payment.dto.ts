import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

import { $Enums } from '@remoola/database';

export class StartPaymentDto {
  @Expose()
  @ApiProperty()
  @IsEmail()
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
