import { ApiProperty, ApiPropertyOptional, OmitType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from 'src/constants'
import { IInvoiceModel, InvoiceStatus, invoiceStatuses } from 'src/models'

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

export class InvoicesListResponse {
  @Expose()
  @ApiProperty()
  count: number

  @Expose()
  @ApiProperty({ type: [InvoiceResponse] })
  @Type(() => InvoiceResponse)
  data: InvoiceResponse[]
}
