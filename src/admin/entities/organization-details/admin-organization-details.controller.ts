import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminOrganizationDetailsService } from './admin-organization-details.service'

@ApiTags(`admin`)
@Controller(`admin/organization-details`)
export class AdminOrganizationDetailsController {
  constructor(@Inject(AdminOrganizationDetailsService) private readonly service: AdminOrganizationDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.OrganizationDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.OrganizationDetailsResponse> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IOrganizationDetailsModel>,
    @Response() res: IExpressResponse,
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
}
