import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IBillingDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminBillingDetailsService } from './admin-billing-details.service'

@ApiTags(`admin`)
@Controller(`admin/billing-details`)
export class AdminBillingDetailsController {
  constructor(@Inject(AdminBillingDetailsService) private readonly service: AdminBillingDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.BillingDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.BillingDetailsResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IBillingDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.BillingDetailsResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:billingDetailsId`)
  @ApiOkResponse({ type: ADMIN.BillingDetailsResponse })
  getById(@Param(`billingDetailsId`) billingDetailsId: string): Promise<ADMIN.BillingDetailsResponse> {
    return this.service.repository.findById(billingDetailsId)
  }

  @Put(`/:billingDetailsId`)
  @ApiOkResponse({ type: ADMIN.BillingDetailsResponse })
  updateById(
    @Param(`billingDetailsId`) billingDetailsId: string,
    @Body() body: ADMIN.BillingDetailsUpdate,
  ): Promise<ADMIN.BillingDetailsResponse> {
    return this.service.repository.updateById(billingDetailsId, body)
  }
}
