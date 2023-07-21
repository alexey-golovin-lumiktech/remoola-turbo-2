import { Body, Controller, Delete, Get, Inject, MethodNotAllowedException, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ReqAuthIdentity } from 'src/guards/auth.guard'

import { AdminType } from '@wirebill/shared-common/enums'
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
    @ReqAuthIdentity() identity: IAdminModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IAdminModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.AdminResponse>> {
    if (identity.type != AdminType.Super) query = { ...query, filter: { ...query.filter, type: AdminType.Admin } }

    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  create(@ReqAuthIdentity() identity: IAdminModel, @Body() body: ADMIN.CreateAdmin): Promise<ADMIN.AdminResponse> {
    if (identity.type != AdminType.Super) throw new MethodNotAllowedException(`Allowed only for admin type "super"`)
    return this.service.create(body)
  }

  @Put(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  update(
    @ReqAuthIdentity() identity: IAdminModel,
    @Param(`adminId`) adminId: string,
    @Body() body: ADMIN.UpdateAdmin,
  ): Promise<ADMIN.AdminResponse> {
    if (identity.type != AdminType.Super) throw new MethodNotAllowedException(`Allowed only for admin type "super"`)
    return this.service.update(adminId, body)
  }

  @Get(`/:adminId`)
  @TransformResponse(ADMIN.AdminResponse)
  @ApiOkResponse({ type: ADMIN.AdminResponse })
  getById(@Param(`adminId`) adminId: string): Promise<ADMIN.AdminResponse> {
    return this.service.repository.findById(adminId)
  }

  @Delete(`/:adminId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@ReqAuthIdentity() identity: IAdminModel, @Param(`adminId`) adminId: string): Promise<boolean> {
    if (identity.type != AdminType.Super) throw new MethodNotAllowedException(`Allowed only for admin type "super"`)
    return this.service.repository.deleteById(adminId)
  }
}
