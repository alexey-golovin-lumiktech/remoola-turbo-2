import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminPersonalDetailsService } from './admin-personal-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/personal-details`)
export class AdminPersonalDetailsController {
  constructor(@Inject(AdminPersonalDetailsService) private readonly service: AdminPersonalDetailsService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.PersonalDetailsListResponse)
  @ApiOkResponse({ type: ADMIN.PersonalDetailsListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPersonalDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.PersonalDetailsListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.PersonalDetailsResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.PersonalDetailsResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.PersonalDetailsResponse })
  updateById(@Param(`id`) id: string, @Body() body: unknown): Promise<ADMIN.PersonalDetailsResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
