import { ApiProperty, PickType } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'
import { IsNumber, IsString } from 'class-validator'

import { IInvoiceItemModel } from '../../models'
import { BaseModel, ListResponse } from '../common'

export class InvoiceItem extends BaseModel implements IInvoiceItemModel {
  @Expose()
  @ApiProperty()
  @IsString()
  invoiceId: string

  @Expose()
  @ApiProperty()
  @IsString()
  description: string

  @Expose()
  @ApiProperty()
  @IsString()
  currency: string

  @Expose()
  @ApiProperty()
  @IsNumber()
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

export class CreateInvoiceItem extends PickType(InvoiceItem, [`amount`, `description`] as const) {}
