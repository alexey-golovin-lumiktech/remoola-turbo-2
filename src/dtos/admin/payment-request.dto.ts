import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

import { CurrencyCode, PaymentStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IPaymentRequestModel } from '@wirebill/shared-common/models'
import { CurrencyCodeValue, PaymentStatusValue, TransactionTypeValue } from '@wirebill/shared-common/types'

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
  amount: number

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  currencyCode: CurrencyCodeValue

  @Expose()
  @ApiProperty()
  dueBy: Date

  @Expose()
  @ApiProperty()
  sentDate: Date

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionType) })
  @IsString()
  @IsIn(Object.values(TransactionType))
  transactionType: TransactionTypeValue

  @Expose()
  @ApiProperty({ enum: Object.values(PaymentStatus) })
  @IsString()
  @IsIn(Object.values(PaymentStatus))
  status: PaymentStatusValue

  @Expose()
  @ApiProperty()
  taxId: string
}

export class PaymentRequestResponse extends OmitType(PaymentRequest, [`deletedAt`] as const) {}

export class UpdatePaymentRequest extends PickType(PaymentRequest, [`status`] as const) {}
