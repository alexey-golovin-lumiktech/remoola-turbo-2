import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ReqQueryTransformPipe } from '@-/admin/pipes'
import { ADMIN } from '@-/dtos'
import { TransformResponse } from '@-/interceptors'

import { AdminOrganizationDetailsService } from './admin-organization-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/organization-details`)
export class AdminOrganizationDetailsController {
  constructor(@Inject(AdminOrganizationDetailsService) private readonly service: AdminOrganizationDetailsService) {}

  @Get()
  @TransformResponse(ADMIN.OrganizationDetailsListResponse)
  @ApiOkResponse({ type: ADMIN.OrganizationDetailsListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IOrganizationDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.OrganizationDetailsListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.OrganizationDetailsResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.OrganizationDetailsResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.OrganizationDetailsResponse })
  updateById(@Param(`id`) id: string, @Body() body: ADMIN.OrganizationDetailsUpdate): Promise<ADMIN.OrganizationDetailsResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
