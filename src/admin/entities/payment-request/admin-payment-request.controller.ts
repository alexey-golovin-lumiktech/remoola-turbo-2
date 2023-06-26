import { Body, Controller, Get, Inject, Param, Patch, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ADMIN } from '../../../dtos'
import { UpdatePayment } from '../../../dtos/admin'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { IPaymentRequestModel } from '../../../models'
import { ListQuery } from '../../../shared-types'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminPaymentRequestService } from './admin-payment-request.service'

@ApiTags(`admin`)
@Controller(`admin/payment-request`)
export class AdminPaymentRequestController {
  constructor(@Inject(AdminPaymentRequestService) private readonly service: AdminPaymentRequestService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.PaymentResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.PaymentResponse> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IPaymentRequestModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.PaymentResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:paymentId`)
  @ApiOkResponse({ type: ADMIN.PaymentResponse })
  getById(@Param(`paymentId`) paymentId: string): Promise<ADMIN.PaymentResponse> {
    return this.service.repository.findById(paymentId)
  }

  @Patch(`/:paymentId`)
  updatePaymentStatus(@Param(`paymentId`) paymentId: string, @Body() body: UpdatePayment) {
    return this.service.repository.updateById(paymentId, body)
  }
}
