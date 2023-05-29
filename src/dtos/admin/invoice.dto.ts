import { ApiProperty, PickType } from '@nestjs/swagger'
import { InvoiceStatus, invoiceStatuses } from '@wirebill/back-and-front'
import { Exclude, Expose, Type } from 'class-transformer'

import { IInvoiceModel } from '../../models'
import { BaseModel, ListResponse } from '../common'

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

export class InvoiceResponse extends Invoice {}

export class InvoicesList extends ListResponse<InvoiceResponse> {
  @Expose()
  @ApiProperty({ type: [InvoiceResponse] })
  @Type(() => InvoiceResponse)
  data: InvoiceResponse[]
}

export class UpdateInvoiceStatus extends PickType(InvoiceResponse, [`status`] as const) {}
