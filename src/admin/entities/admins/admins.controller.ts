import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as ResponseType } from 'express'

import { AdminPanelQueryTransformPipe } from '../../../admin/pipes'
import { IQuery } from '../../../common/types'
import { ApiCountRowsResponse } from '../../../decorators'
import { Admin, CreateAdmin, ListResponse, UpdateAdmin } from '../../../dtos'
import { IAdminModel } from '../../../models'

import { AdminsService } from './admins.service'

@ApiTags(`admin`)
@Controller(`admin/admins`)
export class AdminsController {
  constructor(@Inject(AdminsService) private readonly service: AdminsService) {}

  @Get(`/`)
  @ApiCountRowsResponse(Admin)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IAdminModel>,
    @Response() res: ResponseType
  ): Promise<ListResponse<Admin>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @ApiOkResponse({ type: Admin })
  create(@Body() body: CreateAdmin): Promise<Admin> {
    return this.service.create(body)
  }

  @Put(`/:adminId`)
  @ApiOkResponse({ type: Admin })
  update(@Param(`adminId`) adminId: string, @Body() body: UpdateAdmin): Promise<Admin> {
    return this.service.update(adminId, body)
  }

  @Get(`/:adminId`)
  @ApiOkResponse({ type: Admin })
  getById(@Param(`adminId`) adminId: string): Promise<Admin> {
    return this.service.repository.findById(adminId)
  }
}
