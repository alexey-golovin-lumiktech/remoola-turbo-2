import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IInvoiceModel, InvoiceStatus, invoiceStatuses } from 'src/models'

export class Invoice implements IInvoiceModel {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  creator: string

  @Expose()
  @ApiProperty()
  referer: string

  @Expose()
  @ApiProperty()
  charges: number

  @Expose()
  @ApiProperty()
  tax: number

  @Expose()
  @ApiProperty({ enum: invoiceStatuses })
  status: InvoiceStatus

  @Expose()
  @ApiPropertyOptional({ default: null })
  description?: string

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date

  @Expose()
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date
}

export class UpdateInvoiceStatus extends PickType(Invoice, [`status`] as const) {}
