import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

import { type ConsumerStartPaymentPayload } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { IsValidEmail } from '../../../../shared-common';

export class StartPayment implements ConsumerStartPaymentPayload {
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
  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @ApiProperty()
  @IsEnum($Enums.PaymentMethodType)
  method: $Enums.PaymentMethodType;
}
