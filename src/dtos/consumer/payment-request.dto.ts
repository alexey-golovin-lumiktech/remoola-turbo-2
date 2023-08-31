import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsDate, IsEmail, IsIn, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator'

import { IPaymentRequestResponseExtended } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import {
  CurrencyCodeValue,
  ReqQueryFilter,
  SortDirectionValue,
  TransactionStatusValue,
  TransactionTypeValue,
} from '@wirebill/shared-common/types'

import { INVALID_EMAIL } from '../../constants'
import { BaseModel } from '../common'

import { PaymentRequestAttachmentResponse } from './payment-request-attachment.dto'

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

export class PaymentRequestResponse extends OmitType(PaymentRequest, [`deletedAt`] as const) implements IPaymentRequestResponseExtended {
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

  @Expose()
  @ApiProperty({ required: false, type: [PaymentRequestAttachmentResponse] })
  @Type(() => PaymentRequestAttachmentResponse)
  attachments: PaymentRequestAttachmentResponse[] = []
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

export class PaymentRequestPayToContact extends PickType(PaymentRequest, [`description`, `amount`, `currencyCode`, `type`] as const) {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: INVALID_EMAIL })
  contactEmail: string
}
