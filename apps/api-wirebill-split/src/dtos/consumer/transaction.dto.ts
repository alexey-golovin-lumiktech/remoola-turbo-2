import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';

import {
  CurrencyCode,
  TransactionActionType,
  TransactionFeesType,
  TransactionStatus,
  TransactionType,
} from '@remoola/database';

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
  @ApiProperty()
  consumerId: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false, default: null })
  code?: string = null;

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionType))
  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionType;

  @Expose()
  @ApiProperty({ required: true })
  originAmount: number;

  @Expose()
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  currencyCode: CurrencyCode;

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionActionType))
  @ApiProperty({ enum: Object.values(TransactionActionType) })
  actionType: TransactionActionType;

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionStatus))
  @ApiProperty({ enum: Object.values(TransactionStatus) })
  status: TransactionStatus;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true })
  createdBy: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true })
  updatedBy: string;

  @Expose()
  @ApiProperty({ required: false, default: null })
  deletedBy?: string = null;

  @Expose()
  @IsUUID(`all`)
  @ApiProperty()
  paymentRequestId?: string;

  @Expose()
  @ValidateIf(({ value }) => value != null)
  @IsIn(Object.values(TransactionFeesType))
  @IsString()
  @ApiProperty({
    enum: Object.values(TransactionFeesType),
    default: TransactionFeesType.NO_FEES_INCLUDED,
    required: false,
  })
  feesType?: TransactionFeesType = TransactionFeesType.NO_FEES_INCLUDED;

  @Expose()
  @ApiProperty({ required: false })
  feesAmount?: number = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeId?: string = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeFeeInPercents?: number = null;
}

export class TransactionResponse
  extends OmitType(Transaction, [`deletedAt`] as const)
  implements ITransactionResponse {}

export class TransactionListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [TransactionResponse] })
  @Type(() => TransactionResponse)
  data: TransactionResponse[];
}

export class TransactionCreate
  extends PickType(Transaction, [
    `paymentRequestId`,
    `code`,
    `currencyCode`,
    `originAmount`,
    `type`,
    `status`,
    `createdBy`,
    `updatedBy`,
    `deletedBy`,
    `feesAmount`,
    `feesType`,
    `stripeId`,
    `stripeFeeInPercents`,
    `actionType`,
    `consumerId`,
  ] as const)
  implements ITransactionCreate {}

export class TransactionUpdate extends PartialType(TransactionCreate) implements ITransactionUpdate {}

export class GetConsumerBallanceResult implements IGetConsumerBallanceResult {
  @Expose()
  @ApiProperty()
  currencyCode: CurrencyCode;

  @Expose()
  @ApiProperty()
  amount: number;
}

export class GetConsumerBallanceParams implements IGetConsumerBallanceParams {
  @Expose()
  @ApiProperty({ required: true })
  @IsUUID(`all`)
  consumerId: string;

  @Expose()
  @ApiProperty({ required: false, enum: Object.values(CurrencyCode), default: null })
  @ValidateIf((x) => x.value != null)
  @IsIn(Object.values(CurrencyCode))
  currencyCode?: CurrencyCode = null;
}
