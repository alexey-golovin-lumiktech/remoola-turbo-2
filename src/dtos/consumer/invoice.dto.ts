import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Exclude, Expose, Transform, Type } from 'class-transformer'
import { IsEmail, IsIn, IsNumber, IsString, ValidateIf } from 'class-validator'

import { constants } from '../../constants'
import { IInvoiceModel } from '../../models'
import { currencyCode, InvoiceStatus, invoiceStatuses, InvoiceType, invoiceTypes, SortDirection, sortDirections } from '../../shared-types'
import { BaseModel, ListResponse } from '../common'

import { CreateInvoiceItem, InvoiceItem } from './invoice-item.dto'

export class Invoice extends BaseModel implements IInvoiceModel {
  @Expose()
  @ApiProperty()
  @IsString()
  creatorId: string

  @Expose()
  @ApiProperty()
  @IsString()
  refererId: string

  @Expose()
  @ApiProperty({ enum: invoiceStatuses })
  @IsIn(invoiceStatuses)
  status: InvoiceStatus

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  currency?: string

  @Expose()
  @ApiProperty()
  @IsNumber()
  @ValidateIf(({ value }) => value != null)
  tax?: number

  @Expose()
  @ApiProperty()
  @IsNumber()
  subtotal: number

  @Expose()
  @ApiProperty()
  total: number

  @Expose()
  @ApiProperty()
  @IsNumber()
  dueDateInDays: number

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  stripeInvoiceId?: string

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  hostedInvoiceUrl?: string

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
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

export class InvoiceResponse extends OmitType(Invoice, [`deletedAt`, `subtotal`, `total`] as const) {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  referer: string

  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  creator: string

  @Expose()
  @ApiProperty()
  @Transform(({ value: total }) => total / 100)
  total: number

  @Expose()
  @ApiProperty()
  @Transform(({ value: subtotal }) => subtotal / 100)
  subtotal: number

  @Expose()
  @ApiProperty({ type: InvoiceItem })
  @Type(() => InvoiceItem)
  @Transform(({ value: items }) => items.map(x => Object.assign(x, { amount: x.amount / 100 })))
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
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  referer: string

  @Expose()
  @ApiProperty({ required: false, default: currencyCode.USD })
  currency?: string

  @Expose()
  @ApiProperty({ required: false, default: 0 })
  tax?: number

  @Expose()
  @ApiProperty()
  dueDateInDays: number

  @Expose()
  @ApiProperty({ type: [CreateInvoiceItem] })
  @Type(() => CreateInvoiceItem)
  @Transform(({ value: items }) => {
    const transformed = items.map(x => Object.assign(x, { amount: x.amount * 100 }))
    return transformed
  })
  items: CreateInvoiceItem[]
}
