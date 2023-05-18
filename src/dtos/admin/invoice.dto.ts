import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IInvoiceModel } from '../../models'
import { InvoiceStatus, invoiceStatuses } from '../../shared-types'
import { BaseModel, ListResponse } from '../common'

class Invoice extends BaseModel implements IInvoiceModel {
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

export class InvoiceResponse extends Invoice {}

export class InvoicesList extends ListResponse<InvoiceResponse> {
  @Expose()
  @ApiProperty({ type: [InvoiceResponse] })
  @Type(() => InvoiceResponse)
  data: InvoiceResponse[]
}

export class UpdateInvoiceStatus extends PickType(Invoice, [`status`] as const) {}
