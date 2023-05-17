import { Controller, Get, Inject, Param, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { AdminPanelQueryTransformPipe } from '../../pipes'

import { GoogleProfilesService } from './google-profiles.service'

import { ApiCountRowsResponse } from 'src/decorators/response-count-rows.decorator'
import { AdminDTOS, CommonDTOS } from 'src/dtos'
import { IGoogleProfileModel } from 'src/models'
import { IQuery } from 'src/shared-types'

@ApiTags(`admin`)
@Controller(`admin/google-profiles`)
export class GoogleProfilesController {
  constructor(@Inject(GoogleProfilesService) private readonly service: GoogleProfilesService) {}

  @Get(`/`)
  @ApiCountRowsResponse(AdminDTOS.GoogleProfileResponse)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IGoogleProfileModel>,
    @Response() res: IExpressResponse,
  ): Promise<CommonDTOS.ListResponseDTO<AdminDTOS.GoogleProfileResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:profileId`)
  @ApiOkResponse({ type: AdminDTOS.GoogleProfileResponse })
  getById(@Param(`profileId`) profileId: string): Promise<AdminDTOS.GoogleProfileResponse> {
    return this.service.repository.findById(profileId)
  }
}
