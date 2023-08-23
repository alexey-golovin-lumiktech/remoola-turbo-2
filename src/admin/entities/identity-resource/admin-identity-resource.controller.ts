import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ReqQueryTransformPipe } from 'src/admin/pipes'
import { ADMIN } from 'src/dtos'
import { TransformResponse } from 'src/interceptors'

import { IIdentityResourceModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { AdminIdentityResourceService } from './admin-identity-resource.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/identity-resource`)
export class AdminIdentityResourceController {
  constructor(@Inject(AdminIdentityResourceService) private readonly service: AdminIdentityResourceService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.IdentityResourceListResponse)
  @ApiOkResponse({ type: ADMIN.IdentityResourceListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IIdentityResourceModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.IdentityResourceListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:identityResourceId`)
  @ApiOkResponse({ type: ADMIN.IdentityResourceResponse })
  getById(@Param(`identityResourceId`) identityResourceId: string): Promise<ADMIN.IdentityResourceResponse> {
    return this.service.repository.findById(identityResourceId)
  }

  @Put(`/:identityResourceId`)
  @ApiOkResponse({ type: ADMIN.IdentityResourceResponse })
  updateById(
    @Param(`identityResourceId`) identityResourceId: string,
    @Body() body: ADMIN.IdentityResourceUpdate,
  ): Promise<ADMIN.IdentityResourceResponse> {
    return this.service.repository.updateById(identityResourceId, body)
  }

  @Delete(`/:identityResourceId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`identityResourceId`) identityResourceId: string): Promise<boolean> {
    return this.service.repository.deleteById(identityResourceId)
  }
}
