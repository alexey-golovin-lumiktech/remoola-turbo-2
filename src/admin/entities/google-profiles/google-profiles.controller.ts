import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBasicAuth, ApiTags } from '@nestjs/swagger'
import { IQuery } from 'src/common/types'
import { IGoogleProfileModel } from 'src/models'
import { GoogleProfilesService } from './google-profiles.service'

@ApiTags(`admin`)
@ApiBasicAuth()
@Controller(`admin/google-profiles`)
export class GoogleProfilesController {
  constructor(@Inject(GoogleProfilesService) private readonly service: GoogleProfilesService) {}

  @Get(`/`)
  @UseGuards(AuthGuard(`basic`))
  getProfile(@Query() query?: IQuery<IGoogleProfileModel>): Promise<{ data: IGoogleProfileModel[]; count: number }> {
    return this.service.repository.findAndCountAll(query)
  }
}
