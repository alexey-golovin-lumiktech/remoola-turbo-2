import { ApiProperty, OmitType } from '@nestjs/swagger'
import { InvoiceStatus, invoiceStatuses, InvoiceType, invoiceTypes, SortDirection, sortDirections } from '@wirebill/back-and-front'
import { Exclude, Expose, Type } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from '../../constants'
import { IInvoiceModel } from '../../models'
import { BaseModel, ListResponse } from '../common'

import { CreateInvoiceItem, InvoiceItem } from './invoice-item.dto'

export class Invoice extends BaseModel implements IInvoiceModel {
  @Expose()
  @ApiProperty()
  creatorId: string

  @Expose()
  @ApiProperty()
  refererId: string

  @Expose()
  @ApiProperty({ enum: invoiceStatuses })
  status: InvoiceStatus

  @Expose()
  @ApiProperty()
  currency?: string

  @Expose()
  @ApiProperty()
  tax?: number

  @Expose()
  @ApiProperty()
  subtotal: number

  @Expose()
  @ApiProperty()
  total: number

  @Expose()
  @ApiProperty()
  stripeInvoiceId?: string

  @Expose()
  @ApiProperty()
  hostedInvoiceUrl?: string

  @Expose()
  @ApiProperty()
  invoicePdf?: string

  @Exclude()
  @ApiProperty()
  metadata?: string
}

export class QueryDataListSorting<TModel> {
  @Expose()
  @ApiProperty()
  field: keyof TModel

  @Expose()
  @ApiProperty({ enum: sortDirections })
  direction: SortDirection
}

export class QueryDataList {
  @Expose()
  @ApiProperty()
  limit?: number

  @Expose()
  @ApiProperty({ default: 0 })
  offset?: number

  @Expose()
  @ApiProperty({ type: QueryDataListSorting, default: undefined })
  sorting?: QueryDataListSorting<IInvoiceModel> = undefined
}

export class QueryInvoices extends QueryDataList {
  @Expose()
  @ApiProperty({ enum: invoiceTypes })
  type?: InvoiceType
}

export class InvoiceResponse extends OmitType(Invoice, [`deletedAt`] as const) {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  referer: string

  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  creator: string

  @Expose()
  @ApiProperty({ type: InvoiceItem })
  @Type(() => InvoiceItem)
  items: InvoiceItem[]
}

export class InvoicesList extends ListResponse<InvoiceResponse> {
  @Expose()
  @ApiProperty({ type: [InvoiceResponse] })
  @Type(() => InvoiceResponse)
  data: InvoiceResponse[]
}

export class CreateInvoice {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  referer: string

  @Expose()
  @ApiProperty({ required: false, default: constants.currencyCode.USD })
  currency?: string

  @Expose()
  @ApiProperty({ required: false, default: 0 })
  tax?: number

  @Expose()
  @ApiProperty({ type: [CreateInvoiceItem] })
  @Type(() => CreateInvoiceItem)
  items: CreateInvoiceItem[]
}
