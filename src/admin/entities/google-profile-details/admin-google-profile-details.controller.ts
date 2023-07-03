import { Controller, Get, Inject, Param, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IGoogleProfileModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

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
  @TransformResponse(ListResponse<ADMIN.GoogleProfileResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.GoogleProfileResponse> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IGoogleProfileModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.GoogleProfileResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:profileId`)
  @ApiOkResponse({ type: ADMIN.GoogleProfileResponse })
  getById(@Param(`profileId`) profileId: string): Promise<ADMIN.GoogleProfileResponse> {
    return this.service.repository.findById(profileId)
  }
}
