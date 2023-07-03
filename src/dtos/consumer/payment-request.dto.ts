import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsDate, IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

import { CurrencyCode, PaymentStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import {
  CurrencyCodeValue,
  ListQueryFilter,
  PaymentStatusValue,
  SortDirectionValue,
  TransactionTypeValue,
} from '@wirebill/shared-common/types'

import { BaseModel, ListResponse } from '../common'

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
  @IsDate()
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

export class PaymentRequestListResponse extends ListResponse<PaymentRequestResponse> {
  @Expose()
  @ApiProperty({ type: PaymentRequestResponse })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[]
}

export class PaymentRequestsListQuery {
  paging: { limit: number; offset: number }
  sorting: [{ field: string; direction: SortDirectionValue }]
  filter: ListQueryFilter<IConsumerModel>
}
