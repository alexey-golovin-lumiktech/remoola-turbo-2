import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IInvoiceModel } from '../../../models'
import { IQuery } from '../../../shared-types'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { InvoicesService } from './invoices.service'

@ApiTags(`admin`)
@Controller(`admin/invoices`)
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly service: InvoicesService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.InvoicesList)
  @ApiOkResponse({ type: ADMIN.InvoicesList })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IInvoiceModel>,
    @Response() res: IExpressResponse,
  ): Promise<ADMIN.InvoicesList> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:invoiceId`)
  @TransformResponse(ADMIN.InvoiceResponse)
  @ApiOkResponse({ type: ADMIN.InvoiceResponse })
  getById(@Param(`invoiceId`) invoiceId: string): Promise<ADMIN.InvoiceResponse> {
    return this.service.repository.findById(invoiceId) as Promise<ADMIN.InvoiceResponse>
  }

  @Put(`/:invoiceId`)
  @TransformResponse(ADMIN.InvoiceResponse)
  @ApiOkResponse({ type: ADMIN.InvoiceResponse })
  updateInvoiceStatus(@Param(`invoiceId`) invoiceId: string, @Body() body: ADMIN.UpdateInvoiceStatus): Promise<ADMIN.InvoiceResponse> {
    return this.service.repository.updateById(invoiceId, body) as Promise<ADMIN.InvoiceResponse>
  }
}
