import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IAdminModel } from '../../../models'
import { IQuery } from '../../../shared-types'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminsService } from './admins.service'

@ApiTags(`admin`)
@Controller(`admin/admins`)
export class AdminsController {
  constructor(@Inject(AdminsService) private readonly service: AdminsService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.AdminsList)
  @ApiOkResponse({ type: ADMIN.AdminsList })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IAdminModel>,
    @Response() res: IExpressResponse,
  ): Promise<ADMIN.AdminsList> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  create(@Body() body: ADMIN.CreateAdminRequest): Promise<ADMIN.AdminResponse> {
    return this.service.create(body)
  }

  @Put(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  update(@Param(`adminId`) adminId: string, @Body() body: ADMIN.UpdateAdminRequest): Promise<ADMIN.AdminResponse> {
    return this.service.update(adminId, body)
  }

  @Get(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  getById(@Param(`adminId`) adminId: string): Promise<ADMIN.AdminResponse> {
    return this.service.repository.findById(adminId)
  }
}
