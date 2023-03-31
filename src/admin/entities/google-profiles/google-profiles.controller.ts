import { Controller, Get, Inject, Query, Response } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IQuery } from 'src/common/types'
import { ApiCountRowsResponse } from 'src/decorators/response-count-rows.decorator'
import { ListResponse } from 'src/dtos'
import { GoogleProfile } from 'src/dtos/admin/google-profile.dto'
import { IGoogleProfileModel } from 'src/models'
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
}
