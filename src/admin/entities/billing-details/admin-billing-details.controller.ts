import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IBillingDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ReqQueryTransformPipe } from '@-/admin/pipes'
import { ADMIN } from '@-/dtos'
import { TransformResponse } from '@-/interceptors'

import { AdminBillingDetailsService } from './admin-billing-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/billing-details`)
export class AdminBillingDetailsController {
  constructor(@Inject(AdminBillingDetailsService) private readonly service: AdminBillingDetailsService) {}

  @Get()
  @TransformResponse(ADMIN.BillingDetailsListResponse)
  @ApiOkResponse({ type: ADMIN.BillingDetailsListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IBillingDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.BillingDetailsListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.BillingDetailsResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.BillingDetailsResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.BillingDetailsResponse })
  updateById(@Param(`id`) id: string, @Body() body: ADMIN.BillingDetailsUpdate): Promise<ADMIN.BillingDetailsResponse> {
    return this.service.repository.updateById(id, body)
  }
}
