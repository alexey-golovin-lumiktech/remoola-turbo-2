import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { UpdatePaymentRequest } from '../../../dtos/admin'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminPaymentRequestService } from './admin-payment-request.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/payment-requests`)
export class AdminPaymentRequestController {
  constructor(@Inject(AdminPaymentRequestService) private readonly service: AdminPaymentRequestService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.PaymentRequestResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.PaymentRequestResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentRequestModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.PaymentRequestResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:paymentRequestId`)
  @ApiOkResponse({ type: ADMIN.PaymentRequestResponse })
  getById(@Param(`paymentRequestId`) paymentRequestId: string): Promise<ADMIN.PaymentRequestResponse> {
    return this.service.repository.findById(paymentRequestId)
  }

  @Put(`/:paymentRequestId`)
  updateById(@Param(`paymentRequestId`) paymentRequestId: string, @Body() body: UpdatePaymentRequest) {
    return this.service.repository.updateById(paymentRequestId, body)
  }

  @Delete(`/:paymentRequestId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`paymentRequestId`) paymentRequestId: string): Promise<boolean> {
    return this.service.repository.deleteById(paymentRequestId)
  }
}
