import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IPaymentMethodModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminPaymentMethodService } from './admin-payment-method.service'

@ApiTags(`admin`)
@ApiTags(`payment-methods`)
@ApiBearerAuth()
@Controller(`admin/payment-methods`)
export class AdminPaymentMethodController {
  constructor(@Inject(AdminPaymentMethodService) private readonly service: AdminPaymentMethodService) {}

  @Get()
  @TransformResponse(ADMIN.PaymentMethodListResponse)
  @ApiOkResponse({ type: ADMIN.PaymentMethodListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentMethodModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.PaymentMethodListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.PaymentMethodResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.PaymentMethodResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.PaymentMethodResponse })
  updateById(@Param(`id`) id: string, @Body() body: unknown): Promise<ADMIN.PaymentMethodResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
