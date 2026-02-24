import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IGetConsumerBallanceParams,
  type IGetConsumerBallanceResult,
  type ITransactionCreate,
  type ITransactionModel,
  type ITransactionResponse,
  type ITransactionUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class Transaction extends BaseModel implements ITransactionModel {
  @Expose()
  @IsUUID(`all`)
  @ApiProperty({ description: `ID of the consumer who owns this transaction` })
  consumerId: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: `Unique transaction code/reference (optional, auto-generated if not provided)`,
    required: false,
    default: null,
  })
  code?: string = null;

  @Expose()
  @IsString()
  @IsIn(Object.values($Enums.TransactionType))
  @ApiProperty({
    description: `Transaction type (e.g., PAYMENT, REFUND, TRANSFER, FEE)`,
    enum: Object.values($Enums.TransactionType),
  })
  type: $Enums.TransactionType;

  @Expose()
  @ApiProperty({ description: `Transaction amount in the specified currency (major units)`, required: true })
  amount: number;

  @Expose()
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  @ApiProperty({ description: `Currency code (ISO 4217)`, enum: Object.values($Enums.CurrencyCode) })
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @IsString()
  @IsIn(Object.values($Enums.TransactionStatus))
  @ApiProperty({
    description: `Transaction status (PENDING, COMPLETED, FAILED, CANCELLED)`,
    enum: Object.values($Enums.TransactionStatus),
  })
  status: $Enums.TransactionStatus;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: `ID of the user who created the transaction`, required: true })
  createdBy: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: `ID of the user who last updated the transaction`, required: true })
  updatedBy: string;

  @Expose()
  @ApiProperty({
    description: `ID of the user who soft-deleted the transaction (null if not deleted)`,
    required: false,
    default: null,
  })
  deletedBy?: string = null;

  @Expose()
  @IsUUID(`all`)
  @ApiProperty({ description: `ID of the associated payment request (if applicable)`, required: false })
  paymentRequestId?: string;

  @Expose()
  @ValidateIf(({ value }) => value != null)
  @IsIn(Object.values($Enums.TransactionFeesType))
  @IsString()
  @ApiProperty({
    description: `Fees type indicating how fees are handled (NO_FEES_INCLUDED, FEES_INCLUDED)`,
    enum: Object.values($Enums.TransactionFeesType),
    default: $Enums.TransactionFeesType.NO_FEES_INCLUDED,
    required: false,
  })
  feesType?: $Enums.TransactionFeesType = $Enums.TransactionFeesType.NO_FEES_INCLUDED;

  @Expose()
  @ApiProperty({ description: `Fees amount in the transaction currency`, required: false })
  feesAmount?: number = null;

  @Expose()
  @ApiProperty({ description: `Stripe transaction ID for payment processing tracking`, required: false, default: null })
  stripeId?: string = null;

  @Expose()
  @ApiProperty({ description: `Stripe fee percentage for this transaction`, required: false, default: null })
  stripeFeeInPercents?: number = null;
}

export class TransactionResponse
  extends OmitType(Transaction, [`deletedAt`] as const)
  implements ITransactionResponse {}

export class TransactionListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of transactions in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of transaction records`, required: true, type: [TransactionResponse] })
  @Type(() => TransactionResponse)
  data: TransactionResponse[];
}

export class TransactionCreate
  extends PickType(Transaction, [
    `paymentRequestId`,
    `code`,
    `currencyCode`,
    `amount`,
    `type`,
    `status`,
    `createdBy`,
    `updatedBy`,
    `deletedBy`,
    `feesAmount`,
    `feesType`,
    `stripeId`,
    `stripeFeeInPercents`,
    `consumerId`,
  ] as const)
  implements ITransactionCreate {}

export class TransactionUpdate extends PartialType(TransactionCreate) implements ITransactionUpdate {}

export class GetConsumerBallanceResult implements IGetConsumerBallanceResult {
  @Expose()
  @ApiProperty({ description: `Currency code for the balance amount` })
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ description: `Balance amount in the specified currency (major units)` })
  amount: number;
}

export class GetConsumerBallanceParams implements IGetConsumerBallanceParams {
  @Expose()
  @ApiProperty({ description: `Consumer ID to fetch balance for`, required: true })
  @IsUUID(`all`)
  consumerId: string;

  @Expose()
  @ApiProperty({
    description: `Optional currency code to filter balance by currency`,
    required: false,
    enum: Object.values($Enums.CurrencyCode),
    default: null,
  })
  @ValidateIf((x) => x.value != null)
  @IsIn(Object.values($Enums.CurrencyCode))
  currencyCode?: $Enums.CurrencyCode = null;
}
