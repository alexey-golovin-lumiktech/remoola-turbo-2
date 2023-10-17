import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { GoogleProfileDetailsService } from './google-profile-details.service'

@ApiTags(`consumer`)
@ApiTags(`google-profile-details`)
@ApiBearerAuth()
@Controller(`consumer/google-profile-details`)
export class GoogleProfileDetailsController {
  constructor(@Inject(GoogleProfileDetailsService) private readonly service: GoogleProfileDetailsService) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.GoogleProfileDetailsResponse })
  @TransformResponse(CONSUMER.GoogleProfileDetailsResponse)
  getConsumerGoogleProfileDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.GoogleProfileDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.googleProfileDetailsId })
  }
}
