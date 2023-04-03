import { Controller, Get, Inject, Param, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { IQuery } from '../../../common/types'
import { ApiCountRowsResponse } from '../../../decorators/response-count-rows.decorator'
import { ListResponse } from '../../../dtos'
import { GoogleProfile } from '../../../dtos/admin/google-profile.dto'
import { IGoogleProfileModel } from '../../../models'
import { GoogleProfilesService } from './google-profiles.service'
import { Response as IExpressResponse } from 'express'

@ApiTags(`admin`)
@Controller(`admin/google-profiles`)
export class GoogleProfilesController {
  constructor(@Inject(GoogleProfilesService) private readonly service: GoogleProfilesService) {}

  @Get(`/`)
  @ApiCountRowsResponse(GoogleProfile)
  async findAndCountAll(
    @Query() query: IQuery<IGoogleProfileModel>,
    @Response() res: IExpressResponse
  ): Promise<ListResponse<GoogleProfile>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:profileId`)
  @ApiOkResponse({ type: GoogleProfile })
  getById(@Param(`profileId`) profileId: string): Promise<GoogleProfile> {
    return this.service.repository.findById(profileId)
  }
}
