import { Controller, Get, Inject, Param, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IGoogleProfileModel } from '../../../models'
import { IQuery } from '../../../shared-types'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminGoogleProfileDetailsService } from './admin-google-profile-details.service'

@ApiTags(`admin`)
@Controller(`admin/google-profile-details`)
export class AdminGoogleProfileDetailsController {
  constructor(@Inject(AdminGoogleProfileDetailsService) private readonly service: AdminGoogleProfileDetailsService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.GoogleProfilesList)
  @ApiOkResponse({ type: ADMIN.GoogleProfilesList })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IGoogleProfileModel>,
    @Response() res: IExpressResponse,
  ): Promise<ADMIN.GoogleProfilesList> {
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
