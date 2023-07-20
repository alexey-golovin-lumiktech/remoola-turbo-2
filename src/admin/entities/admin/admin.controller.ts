import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IAdminModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminService } from './admin.service'

@ApiTags(`admin`)
@Controller(`admin/admins`)
export class AdminController {
  constructor(@Inject(AdminService) private readonly service: AdminService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.AdminResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.AdminResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IAdminModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.AdminResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  create(@Body() body: ADMIN.CreateAdmin): Promise<ADMIN.AdminResponse> {
    return this.service.create(body)
  }

  @Put(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  update(@Param(`adminId`) adminId: string, @Body() body: ADMIN.UpdateAdmin): Promise<ADMIN.AdminResponse> {
    return this.service.update(adminId, body)
  }

  @Get(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  getById(@Param(`adminId`) adminId: string): Promise<ADMIN.AdminResponse> {
    return this.service.repository.findById(adminId)
  }
}
