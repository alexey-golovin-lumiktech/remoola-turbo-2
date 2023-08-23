import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsDate, IsIn, IsNotEmpty, IsNumber, IsString, ValidateIf } from 'class-validator'

import { IPaymentRequestResponse } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import {
  CurrencyCodeValue,
  ReqQueryFilter,
  SortDirectionValue,
  TransactionStatusValue,
  TransactionTypeValue,
} from '@wirebill/shared-common/types'

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
  description: string

  @Expose()
  @ApiProperty()
  @IsDate()
  dueBy: Date

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

export class PaymentRequestResponse extends OmitType(PaymentRequest, [`deletedAt`] as const) implements IPaymentRequestResponse {
  @Expose()
  @ApiProperty()
  payerName: string

  @Expose()
  @ApiProperty()
  payerEmail: string

  @Expose()
  @ApiProperty()
  requesterName: string

  @Expose()
  @ApiProperty()
  requesterEmail: string
}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[]
}

export class PaymentRequestsListQuery {
  paging: { limit: number; offset: number }
  sorting: [{ field: string; direction: SortDirectionValue }]
  filter: ReqQueryFilter<IConsumerModel>
}

export class PaymentRequestPayToContact extends PickType(PaymentRequest, [
  `requesterId`,
  `description`,
  `transactionAmount`,
  `transactionCurrencyCode`,
  `transactionType`,
  `stripeFeeInPercents`,
] as const) {}
