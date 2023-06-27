import { ApiProperty, OmitType } from '@nestjs/swagger'
import { ListQueryFilter, PaymentStatus, SortDirectionValue, TransactionType } from '@wirebill/back-and-front'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

import { IConsumerModel, IPaymentRequestModel } from '../../models'
import { CurrencyCode, CurrencyCodeValue, PaymentStatusValue, TransactionTypeValue } from '../../shared-types'
import { BaseModel } from '../common'

class Payment extends BaseModel implements IPaymentRequestModel {
  requesterId: string
  payerId: string
  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requester: string

  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payer: string

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

export class PaymentResponse extends OmitType(Payment, [`deletedAt`] as const) {}

export class PaymentsListQuery {
  paging: { limit: number; offset: number }
  sorting: [{ field: string; direction: SortDirectionValue }]
  filter: ListQueryFilter<IConsumerModel>
}
