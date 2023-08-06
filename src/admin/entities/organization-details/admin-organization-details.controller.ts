import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminOrganizationDetailsService } from './admin-organization-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/organization-details`)
export class AdminOrganizationDetailsController {
  constructor(@Inject(AdminOrganizationDetailsService) private readonly service: AdminOrganizationDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.OrganizationDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.OrganizationDetailsResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IOrganizationDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.OrganizationDetailsResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:organizationDetailsId`)
  @ApiOkResponse({ type: ADMIN.OrganizationDetailsResponse })
  getById(@Param(`organizationDetailsId`) organizationDetailsId: string): Promise<ADMIN.OrganizationDetailsResponse> {
    return this.service.repository.findById(organizationDetailsId)
  }

  @Put(`/:organizationDetailsId`)
  @ApiOkResponse({ type: ADMIN.OrganizationDetailsResponse })
  updateById(
    @Param(`organizationDetailsId`) organizationDetailsId: string,
    @Body() body: ADMIN.UpdateOrganizationDetails,
  ): Promise<ADMIN.OrganizationDetailsResponse> {
    return this.service.repository.updateById(organizationDetailsId, body)
  }

  @Delete(`/:organizationDetailsId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`organizationDetailsId`) organizationDetailsId: string): Promise<boolean> {
    return this.service.repository.deleteById(organizationDetailsId)
  }
}
