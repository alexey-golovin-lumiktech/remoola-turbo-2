import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IAdminResourceModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminResourceService } from './admin-resource.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/identity-resource`)
export class AdminResourceController {
  constructor(@Inject(AdminResourceService) private readonly service: AdminResourceService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.AdminResourceListResponse)
  @ApiOkResponse({ type: ADMIN.AdminResourceListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IAdminResourceModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.AdminResourceListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:resourceId`)
  @ApiOkResponse({ type: ADMIN.AdminResourceResponse })
  getById(@Param(`resourceId`) resourceId: string): Promise<ADMIN.AdminResourceResponse> {
    return this.service.repository.findById(resourceId)
  }

  @Put(`/:resourceId`)
  @ApiOkResponse({ type: ADMIN.AdminResourceResponse })
  updateById(@Param(`resourceId`) resourceId: string, @Body() body: ADMIN.AdminResourceUpdate): Promise<ADMIN.AdminResourceResponse> {
    return this.service.repository.updateById(resourceId, body)
  }

  @Delete(`/:resourceId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`resourceId`) resourceId: string): Promise<boolean> {
    return this.service.repository.deleteById(resourceId)
  }
}
