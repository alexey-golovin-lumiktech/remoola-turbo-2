import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsIn, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database';

import { IPaymentRequestModel, IPaymentRequestResponse, IPaymentRequestUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class PaymentRequest extends BaseModel implements IPaymentRequestModel {
  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  requesterId: string;

  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  payerId: string;

  @Expose()
  @ApiProperty()
  @IsNumber()
  amount: number;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty()
  @IsString()
  description: string;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.TransactionType) })
  @IsString()
  @IsIn(Object.values($Enums.TransactionType))
  type: $Enums.TransactionType;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.TransactionStatus) })
  @IsString()
  @IsIn(Object.values($Enums.TransactionStatus))
  status: $Enums.TransactionStatus;

  @Expose()
  @ApiProperty()
  @IsDate()
  dueDate: Date;

  @Expose()
  @ApiProperty()
  @IsDate()
  sentDate: Date;

  @Expose()
  @ApiProperty()
  @IsDate()
  expectationDate: Date;

  @Expose()
  @ApiProperty()
  @IsString()
  createdBy: string;

  @Expose()
  @ApiProperty()
  @IsString()
  updatedBy: string;

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((x) => x.value != null)
  @IsString()
  deletedBy?: string = null;
}

export class PaymentRequestResponse
  extends OmitType(PaymentRequest, [`deletedAt`] as const)
  implements IPaymentRequestResponse {}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[];
}

export class PaymentRequestUpdate
  extends PickType(PaymentRequest, [`status`] as const)
  implements IPaymentRequestUpdate {}
