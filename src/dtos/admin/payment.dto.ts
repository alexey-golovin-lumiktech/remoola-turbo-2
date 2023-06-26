import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { PaymentStatus, TransactionType } from '@wirebill/back-and-front'
import { Expose } from 'class-transformer'
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

import { IPaymentRequestModel } from '../../models'
import { PaymentStatusValue, TransactionTypeValue } from '../../shared-types'
import { BaseModel } from '../common'

class Payment extends BaseModel implements IPaymentRequestModel {
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

export class UpdatePayment extends PickType(Payment, [`status`] as const) {}
