import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator'

import { ITransactionCreate, ITransactionResponse, ITransactionUpdate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { ITransactionModel } from '@wirebill/shared-common/models'
import { CurrencyCodeValue, TransactionStatusValue, TransactionTypeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class Transaction extends BaseModel implements ITransactionModel {
  @Expose()
  @ApiProperty({ required: true })
  @IsUUID(`all`)
  paymentRequestId: string

  @Expose()
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  code?: string

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  currencyCode: CurrencyCodeValue

  @Expose()
  @ApiProperty({ required: true })
  originAmount: number

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionType) })
  @IsString()
  @IsIn(Object.values(TransactionType))
  type: TransactionTypeValue

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionStatus) })
  @IsString()
  @IsIn(Object.values(TransactionStatus))
  status: TransactionStatusValue

  @Expose()
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  createdBy: string

  @Expose()
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  updatedBy: string

  @Expose()
  @ApiProperty({ required: false })
  deletedBy?: string

  @Expose()
  @ApiProperty({ required: false })
  feesAmount?: number

  @Expose()
  @ApiProperty({ required: false })
  feesType?: string

  @Expose()
  @ApiProperty({ required: false })
  stripeId?: string

  @Expose()
  @ApiProperty({ required: false })
  stripeFeeInPercents?: number
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
  ] as const)
  implements ITransactionCreate {}

export class TransactionUpdate extends PartialType(TransactionCreate) implements ITransactionUpdate {}
