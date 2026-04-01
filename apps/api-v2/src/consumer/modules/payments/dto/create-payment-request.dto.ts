import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import { IsValidEmail } from '../../../../shared-common';

export class CreatePaymentRequest {
  @Expose()
  @ApiProperty()
  @IsValidEmail()
  email: string;

  @Expose()
  @ApiProperty()
  @IsNumberString()
  amount: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum($Enums.CurrencyCode)
  currencyCode?: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
