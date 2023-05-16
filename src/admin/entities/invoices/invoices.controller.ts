import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { InvoicesService } from './invoices.service'

import { AdminPanelQueryTransformPipe } from 'src/admin/pipes'
import { IQuery } from 'src/common'
import { ApiCountRowsResponse } from 'src/decorators'
import { AdminDTOS, CommonDTOS } from 'src/dtos'
import { IInvoiceModel } from 'src/models'

@ApiTags(`admin`)
@Controller(`admin/invoices`)
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly service: InvoicesService) {}

  @Get(`/`)
  @ApiCountRowsResponse(AdminDTOS.InvoiceResponse)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IInvoiceModel>,
    @Response() res: IExpressResponse,
  ): Promise<CommonDTOS.ListResponseDTO<AdminDTOS.InvoiceResponse>> {
    const result = (await this.service.repository.findAndCountAll(query)) as CommonDTOS.ListResponseDTO<AdminDTOS.InvoiceResponse>
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:invoiceId`)
  @ApiOkResponse({ type: AdminDTOS.InvoiceResponse })
  getById(@Param(`invoiceId`) invoiceId: string): Promise<AdminDTOS.InvoiceResponse> {
    return this.service.repository.findById(invoiceId) as Promise<AdminDTOS.InvoiceResponse>
  }

  @Put(`/:invoiceId`)
  @ApiOkResponse({ type: AdminDTOS.InvoiceResponse })
  updateInvoiceStatus(
    @Param(`invoiceId`) invoiceId: string,
    @Body() body: AdminDTOS.UpdateInvoiceStatus,
  ): Promise<AdminDTOS.InvoiceResponse> {
    return this.service.repository.updateById(invoiceId, body) as Promise<AdminDTOS.InvoiceResponse>
  }
}
