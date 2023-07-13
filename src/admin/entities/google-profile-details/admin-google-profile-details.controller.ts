import { Body, Controller, Get, Inject, Param, Put, Query as ReqQuery, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'
import { Query } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminGoogleProfileDetailsService } from './admin-google-profile-details.service'

@ApiTags(`admin`)
@Controller(`admin/google-profile-details`)
export class AdminGoogleProfileDetailsController {
  constructor(@Inject(AdminGoogleProfileDetailsService) private readonly service: AdminGoogleProfileDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.GoogleProfileDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.GoogleProfileDetailsResponse> })
  async findAndCountAll(
    @ReqQuery(new AdminPanelQueryTransformPipe()) query: Query<IGoogleProfileDetailsModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.GoogleProfileDetailsResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:googleProfileDetailsId`)
  @ApiOkResponse({ type: ADMIN.GoogleProfileDetailsResponse })
  getById(@Param(`googleProfileDetailsId`) googleProfileDetailsId: string): Promise<ADMIN.GoogleProfileDetailsResponse> {
    return this.service.repository.findById(googleProfileDetailsId)
  }

  @Put(`/:googleProfileDetailsId`)
  @ApiOkResponse({ type: ADMIN.GoogleProfileDetailsResponse })
  updateById(
    @Param(`googleProfileDetailsId`) googleProfileDetailsId: string,
    @Body() body: ADMIN.UpdateGoogleProfileDetails,
  ): Promise<ADMIN.GoogleProfileDetailsResponse> {
    return this.service.repository.updateById(googleProfileDetailsId, body)
  }
}
