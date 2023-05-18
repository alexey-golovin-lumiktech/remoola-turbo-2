import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEmail } from 'class-validator'

import { BaseModel, ListResponse } from '../common'

import * as constants from 'src/constants'
import { IInvoiceModel } from 'src/models'
import { InvoiceStatus, invoiceStatuses, InvoiceType, invoiceTypes, SortDirection, sortDirections } from 'src/shared-types'

export class Invoice extends BaseModel implements IInvoiceModel {
  @Expose()
  @ApiProperty()
  creatorId: string

  @Expose()
  @ApiProperty()
  refererId: string

  @Expose()
  @ApiProperty()
  charges: number

  @Expose()
  @ApiProperty()
  tax: number

  @Expose()
  @ApiProperty({ required: false, default: null })
  description?: string = null

  @Expose()
  @ApiProperty({ enum: invoiceStatuses })
  status: InvoiceStatus
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
}

export class CreateInvoice extends PickType(Invoice, [`charges`, `description`] as const) {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  referer: string
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
  type?: InvoiceType = null
}

export class InvoicesList extends ListResponse<InvoiceResponse> {
  @Expose()
  @ApiProperty({ type: [InvoiceResponse] })
  @Type(() => InvoiceResponse)
  data: InvoiceResponse[]
}
