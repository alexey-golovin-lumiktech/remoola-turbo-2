import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IQuery } from 'src/common/types'
import { IGoogleProfileModel } from 'src/models'
import { GoogleProfilesService } from './google-profiles.service'

@ApiTags(`admin / entities`)
@Controller(`admin/google-profiles`)
export class GoogleProfilesController {
  constructor(@Inject(GoogleProfilesService) private readonly service: GoogleProfilesService) {}

  @Get(`/`)
  getProfile(@Query() query?: IQuery<IGoogleProfileModel>): Promise<{ data: IGoogleProfileModel[]; count: number }> {
    return this.service.repository.findAndCountAll(query)
  }
}
