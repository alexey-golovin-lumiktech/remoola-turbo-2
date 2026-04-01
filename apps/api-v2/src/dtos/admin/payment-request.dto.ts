import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsIn, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IPaymentRequestModel,
  type IPaymentRequestResponse,
  type IPaymentRequestUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class PaymentRequest extends BaseModel implements IPaymentRequestModel {
  @Expose()
  @ApiProperty({ description: `ID of the consumer who created the payment request` })
  @IsUUID(`all`)
  requesterId: string;

  @Expose()
  @ApiProperty({
    description: `ID of the payer (consumer being billed), null if payer is external`,
    required: false,
    nullable: true,
  })
  @ValidateIf((x) => x.value != null)
  @IsUUID(`all`)
  payerId: string | null;

  @Expose()
  @ApiProperty({ description: `Email of external payer (used when payerId is null)`, required: false, nullable: true })
  @ValidateIf((x) => x.value != null)
  @IsString()
  payerEmail?: string | null;

  @Expose()
  @ApiProperty({ description: `Payment amount in the specified currency (major units, e.g., dollars not cents)` })
  @IsNumber()
  amount: number;

  @Expose()
  @ApiProperty({ description: `Currency code (ISO 4217)`, enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ description: `Payment description or purpose` })
  @IsString()
  description: string;

  @Expose()
  @ApiProperty({
    description: `Transaction type (e.g., PAYMENT, REFUND, CHARGEBACK)`,
    enum: Object.values($Enums.TransactionType),
  })
  @IsString()
  @IsIn(Object.values($Enums.TransactionType))
  type: $Enums.TransactionType;

  @Expose()
  @ApiProperty({
    description: `Payment request status (PENDING, PAID, CANCELLED, EXPIRED)`,
    enum: Object.values($Enums.TransactionStatus),
  })
  @IsString()
  @IsIn(Object.values($Enums.TransactionStatus))
  status: $Enums.TransactionStatus;

  @Expose()
  @ApiProperty({ description: `Due date for payment (ISO 8601 date)` })
  @IsDate()
  dueDate: Date;

  @Expose()
  @ApiProperty({ description: `Date when the payment request was sent to the payer (ISO 8601 date)` })
  @IsDate()
  sentDate: Date;

  @Expose()
  @ApiProperty({ description: `ID of the user who created the payment request` })
  @IsString()
  createdBy: string;

  @Expose()
  @ApiProperty({ description: `ID of the user who last updated the payment request` })
  @IsString()
  updatedBy: string;

  @Expose()
  @ApiProperty({ description: `ID of the user who soft-deleted the request (null if not deleted)`, required: false })
  @ValidateIf((x) => x.value != null)
  @IsString()
  deletedBy?: string = null;
}

export class PaymentRequestResponse
  extends OmitType(PaymentRequest, [`deletedAt`] as const)
  implements IPaymentRequestResponse {}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of payment requests in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of payment request records`, required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[];
}

export class PaymentRequestUpdate
  extends PickType(PaymentRequest, [`status`] as const)
  implements IPaymentRequestUpdate {}
