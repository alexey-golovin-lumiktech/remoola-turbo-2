import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminGoogleProfileDetailsService } from './admin-google-profile-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/google-profile-details`)
export class AdminGoogleProfileDetailsController {
  constructor(@Inject(AdminGoogleProfileDetailsService) private readonly service: AdminGoogleProfileDetailsService) {}

  @Get()
  @TransformResponse(ADMIN.GoogleProfileDetailsListResponse)
  @ApiOkResponse({ type: ADMIN.GoogleProfileDetailsListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IGoogleProfileDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.GoogleProfileDetailsListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.GoogleProfileDetailsResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.GoogleProfileDetailsResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.GoogleProfileDetailsResponse })
  updateById(@Param(`id`) id: string, @Body() body: ADMIN.GoogleProfileDetailsUpdate): Promise<ADMIN.GoogleProfileDetailsResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
