import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Exclude, Expose, Transform, Type } from 'class-transformer'
import { IsEmail, IsIn, IsNumber, IsString, ValidateIf } from 'class-validator'

import * as constants from '../../constants'
import { IInvoiceModel } from '../../models'
import {
  CurrencyCode,
  CurrencyCodeValue,
  InvoiceType,
  InvoiceTypeValue,
  SortDirection,
  SortDirectionValue,
  StripeInvoiceStatus,
  StripeInvoiceStatusValue,
} from '../../shared-types'
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
  @ApiProperty({ enum: Object.values(StripeInvoiceStatus) })
  @IsIn(Object.values(StripeInvoiceStatus))
  status: StripeInvoiceStatusValue

  @Expose()
  @ApiProperty()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  @IsIn(Object.values(CurrencyCode))
  currency?: CurrencyCodeValue

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
  @ApiProperty({ enum: Object.values(SortDirection) })
  direction: SortDirectionValue
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
  @ApiProperty({ enum: Object.values(InvoiceType) })
  type?: InvoiceTypeValue
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
  @ApiProperty({ required: false, default: CurrencyCode.USD })
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
