import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import { IInvoiceItemModel } from '../../models'
import { CurrencyCode, CurrencyCodeValue } from '../../shared-types'
import { BaseModel, ListResponse } from '../common'

export class InvoiceItem extends BaseModel implements IInvoiceItemModel {
  @Expose()
  @ApiProperty()
  invoiceId: string

  @Expose()
  @ApiProperty()
  description: string

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  currency: CurrencyCodeValue

  @Expose()
  @ApiProperty()
  amount: number

  @Exclude()
  @ApiProperty()
  metadata?: string
}

export class InvoiceItemResponse extends InvoiceItem {}

export class InvoiceItemsList extends ListResponse<InvoiceItemResponse> {
  @Expose()
  @ApiProperty({ type: [InvoiceItemResponse] })
  @Type(() => InvoiceItemResponse)
  data: InvoiceItemResponse[]
}
