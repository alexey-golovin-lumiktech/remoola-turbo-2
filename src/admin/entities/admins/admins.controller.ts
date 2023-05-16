import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { AdminsService } from './admins.service'

import { AdminPanelQueryTransformPipe } from 'src/admin/pipes'
import { IQuery } from 'src/common'
import { ApiCountRowsResponse } from 'src/decorators'
import { AdminDTOS, CommonDTOS } from 'src/dtos'
import { IAdminModel } from 'src/models'

@ApiTags(`admin`)
@Controller(`admin/admins`)
export class AdminsController {
  constructor(@Inject(AdminsService) private readonly service: AdminsService) {}

  @Get(`/`)
  @ApiCountRowsResponse(AdminDTOS.AdminResponse)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IAdminModel>,
    @Response() res: IExpressResponse,
  ): Promise<CommonDTOS.ListResponseDTO<AdminDTOS.AdminResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @ApiOkResponse({ type: AdminDTOS.AdminResponse })
  create(@Body() body: AdminDTOS.CreateAdminRequest): Promise<AdminDTOS.AdminResponse> {
    return this.service.create(body)
  }

  @Put(`/:adminId`)
  @ApiOkResponse({ type: AdminDTOS.AdminResponse })
  update(@Param(`adminId`) adminId: string, @Body() body: AdminDTOS.UpdateAdminRequest): Promise<AdminDTOS.AdminResponse> {
    return this.service.update(adminId, body)
  }

  @Get(`/:adminId`)
  @ApiOkResponse({ type: AdminDTOS.AdminResponse })
  getById(@Param(`adminId`) adminId: string): Promise<AdminDTOS.AdminResponse> {
    return this.service.repository.findById(adminId)
  }
}
