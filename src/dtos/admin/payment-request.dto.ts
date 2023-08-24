import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsDate, IsIn, IsNotEmpty, IsNumber, IsString, ValidateIf } from 'class-validator'

import { IPaymentRequestResponse, IPaymentRequestUpdate } from '@wirebill/shared-common/dtos'
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
  description: string

  @Expose()
  @ApiProperty()
  @IsDate()
  dueBy: Date

  @Expose()
  @ApiProperty()
  transactionId?: string = null

  @Expose()
  @ApiProperty()
  @IsDate()
  sentDate?: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  paidOn?: Date

  @Expose()
  @ApiProperty()
  @IsNumber()
  @ValidateIf(({ value }) => value != null)
  stripeFeeInPercents?: number
}

export class PaymentRequestResponse
  extends OmitType(PaymentRequest, [`deletedAt`] as const)
  implements Omit<IPaymentRequestResponse, `payerName` | `payerEmail` | `requesterName` | `requesterEmail`> {}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[]
}

export class PaymentRequestUpdate extends PickType(PaymentRequest, [`transactionStatus`] as const) implements IPaymentRequestUpdate {}
