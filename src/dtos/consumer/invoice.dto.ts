import { ApiProperty, ApiPropertyOptional, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from 'src/constants'
import { IInvoiceModel } from 'src/models'
import { InvoiceStatus, invoiceStatuses, InvoiceType, invoiceTypes, SortDirection, sortDirections } from 'src/shared-types'

export class Invoice implements IInvoiceModel {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date

  @Expose()
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date = null

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
  @ApiPropertyOptional({ default: null })
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
  @ApiPropertyOptional()
  limit?: number

  @Expose()
  @ApiPropertyOptional({ default: 0 })
  offset?: number

  @Expose()
  @ApiPropertyOptional({ type: QueryDataListSorting, default: undefined })
  sorting?: QueryDataListSorting<IInvoiceModel> = undefined
}

export class QueryInvoices extends QueryDataList {
  @Expose()
  @ApiPropertyOptional({ enum: invoiceTypes })
  type?: InvoiceType = null
}
