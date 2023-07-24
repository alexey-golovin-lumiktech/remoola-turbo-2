import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsDate, IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IPaymentRequestModel } from '@wirebill/shared-common/models'
import { CurrencyCodeValue, TransactionStatusValue, TransactionTypeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class PaymentRequest extends BaseModel implements IPaymentRequestModel {
  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requesterId: string

  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payerId: string

  @Expose()
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  transactionAmount: number

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  transactionCurrencyCode: CurrencyCodeValue

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionStatus) })
  @IsString()
  @IsIn(Object.values(TransactionStatus))
  transactionStatus: TransactionStatusValue

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionType) })
  @IsString()
  @IsIn(Object.values(TransactionType))
  transactionType: TransactionTypeValue

  @Expose()
  @ApiProperty()
  transactionId: string

  @Expose()
  @ApiProperty()
  @IsDate()
  dueBy: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  sentDate?: Date
}

export class PaymentRequestResponse extends OmitType(PaymentRequest, [`deletedAt`] as const) {}

export class UpdatePaymentRequest extends PickType(PaymentRequest, [`transactionStatus`] as const) {}
