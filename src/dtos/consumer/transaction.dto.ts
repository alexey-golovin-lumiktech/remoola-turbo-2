import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator'

import { ITransactionCreate, ITransactionResponse, ITransactionUpdate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, FeesType, TransactionActionType, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { ITransactionModel } from '@wirebill/shared-common/models'
import {
  CurrencyCodeValue,
  FeesTypeValue,
  TransactionActionTypeValue,
  TransactionStatusValue,
  TransactionTypeValue,
} from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class Transaction extends BaseModel implements ITransactionModel {
  @Expose()
  @IsUUID(`all`)
  @ApiProperty()
  consumerId: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false, default: null })
  code?: string = null

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionType))
  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionTypeValue

  @Expose()
  @ApiProperty({ required: true })
  originAmount: number

  @Expose()
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  currencyCode: CurrencyCodeValue

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionActionType))
  @ApiProperty({ enum: Object.values(TransactionActionType) })
  actionType: TransactionActionTypeValue

  @Expose()
  @IsString()
  @IsIn(Object.values(TransactionStatus))
  @ApiProperty({ enum: Object.values(TransactionStatus) })
  status: TransactionStatusValue

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true })
  createdBy: string

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: true })
  updatedBy: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  deletedBy?: string = null

  @Expose()
  @IsUUID(`all`)
  @ApiProperty()
  paymentRequestId?: string

  @Expose()
  @ValidateIf(({ value }) => value != null)
  @IsIn(Object.values(FeesType))
  @IsString()
  @ApiProperty({ enum: Object.values(FeesType), default: FeesType.NoFeesIncluded, required: false })
  feesType?: FeesTypeValue = FeesType.NoFeesIncluded

  @Expose()
  @ApiProperty({ required: false })
  feesAmount?: number = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeFeeInPercents?: number = null
}

export class TransactionResponse extends OmitType(Transaction, [`deletedAt`] as const) implements ITransactionResponse {}

export class TransactionListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [TransactionResponse] })
  @Type(() => TransactionResponse)
  data: TransactionResponse[]
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

export type IGetConsumerBallanceResult = { currency: CurrencyCodeValue; ballance: number }
export class GetConsumerBallanceResult implements IGetConsumerBallanceResult {
  @Expose()
  @ApiProperty()
  currency: CurrencyCodeValue

  @Expose()
  @ApiProperty()
  ballance: number
}

export type IGetConsumerBallanceParams = { consumerId: string; currencyCode?: CurrencyCodeValue }
export class GetConsumerBallanceParams implements IGetConsumerBallanceParams {
  @Expose()
  @ApiProperty({ required: true })
  @IsUUID(`all`)
  consumerId: string

  @Expose()
  @ApiProperty({ required: false, enum: Object.values(CurrencyCode), default: null })
  @ValidateIf(x => x.value != null)
  @IsIn(Object.values(CurrencyCode))
  currencyCode?: CurrencyCodeValue = null
}
