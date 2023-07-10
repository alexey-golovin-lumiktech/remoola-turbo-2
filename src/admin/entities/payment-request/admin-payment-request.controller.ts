import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { UpdatePaymentRequest } from '../../../dtos/admin'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminPaymentRequestService } from './admin-payment-request.service'

@ApiTags(`admin`)
@Controller(`admin/payment-request`)
export class AdminPaymentRequestController {
  constructor(@Inject(AdminPaymentRequestService) private readonly service: AdminPaymentRequestService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.PaymentRequestResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.PaymentRequestResponse> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IPaymentRequestModel>,
    @Response() res: IExpressResponse,
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
}
