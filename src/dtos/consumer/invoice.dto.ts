import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEmail, IsIn, IsNumber, IsString } from 'class-validator'

import { IInvoiceModel, InvoiceStatus, invoiceStatuses } from 'src/models'

type InvoiceModelPick = Omit<IInvoiceModel, `deletedAt`>
export class Invoice implements InvoiceModelPick {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsEmail()
  creator: string

  @Expose()
  @ApiProperty()
  @IsEmail()
  referer: string

  @Expose()
  @ApiProperty()
  @IsNumber()
  charges: number

  @Expose()
  @ApiProperty()
  tax: number

  @Expose()
  @ApiPropertyOptional({ default: null })
  description?: string

  @Expose()
  @ApiProperty({ enum: invoiceStatuses })
  @IsIn(invoiceStatuses)
  status: InvoiceStatus

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date
}

export class InvoicesListResponse {
  @Expose()
  @ApiProperty()
  count: number

  @Expose()
  @ApiProperty({ type: [Invoice] })
  @Type(() => Invoice)
  data: Invoice[]
}

export type ICreateInvoice = Pick<IInvoiceModel, `referer` | `charges` | `description`>

export class CreateInvoice extends PickType(Invoice, [`referer`, `charges`, `description`] as const) implements ICreateInvoice {}
