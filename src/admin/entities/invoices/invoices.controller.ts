import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { InvoicesService } from './invoices.service'

import { AdminPanelQueryTransformPipe } from 'src/admin/pipes'
import { IQuery } from 'src/common'
import { ApiCountRowsResponse } from 'src/decorators'
import { Invoice, ListResponse, UpdateInvoiceStatus } from 'src/dtos'
import { IInvoiceModel } from 'src/models'

@ApiTags(`admin`)
@Controller(`admin/invoices`)
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly service: InvoicesService) {}

  @Get(`/`)
  @ApiCountRowsResponse(Invoice)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IInvoiceModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<Invoice>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:invoiceId`)
  @ApiOkResponse({ type: Invoice })
  getById(@Param(`invoiceId`) invoiceId: string): Promise<Invoice> {
    return this.service.repository.findById(invoiceId)
  }

  @Put(`/:invoiceId`)
  @ApiOkResponse({ type: Invoice })
  updateInvoiceStatus(@Param(`invoiceId`) invoiceId: string, @Body() body: UpdateInvoiceStatus): Promise<Invoice> {
    return this.service.repository.updateById(invoiceId, body)
  }
}
