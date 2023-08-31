import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsDate, IsIn, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator'

import { IPaymentRequestResponse, IPaymentRequestUpdate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IPaymentRequestModel } from '@wirebill/shared-common/models'
import { CurrencyCodeValue, TransactionStatusValue, TransactionTypeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class PaymentRequest extends BaseModel implements IPaymentRequestModel {
  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  requesterId: string

  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  payerId: string

  @Expose()
  @ApiProperty()
  @IsNumber()
  amount: number

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  currencyCode: CurrencyCodeValue

  @Expose()
  @ApiProperty()
  @IsString()
  description: string

  @Expose()
  @ApiProperty({ enum: Object.values(TransactionType) })
  @IsString()
  @IsIn(Object.values(TransactionType))
  type: TransactionTypeValue

  @Expose()
  @ApiProperty()
  @ApiProperty({ enum: Object.values(TransactionStatus) })
  @IsString()
  @IsIn(Object.values(TransactionStatus))
  status: TransactionStatusValue

  @Expose()
  @ApiProperty()
  @IsDate()
  dueDate: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  sentDate: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  expectationDate: Date

  @Expose()
  @ApiProperty()
  @IsString()
  createdBy: string

  @Expose()
  @ApiProperty()
  @IsString()
  updatedBy: string

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf(x => x.value != null)
  @IsString()
  deletedBy?: string = null
}

export class PaymentRequestResponse extends OmitType(PaymentRequest, [`deletedAt`] as const) implements IPaymentRequestResponse {}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[]
}

export class PaymentRequestUpdate extends PickType(PaymentRequest, [`status`] as const) implements IPaymentRequestUpdate {}
