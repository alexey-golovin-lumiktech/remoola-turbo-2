import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { GoogleProfileDetailsService } from './google-profile-details.service'

@ApiTags(`consumer`)
@ApiTags(`google-profile-details`)
@ApiBearerAuth()
@Controller(`consumer/google-profile-details`)
export class GoogleProfileDetailsController {
  constructor(@Inject(GoogleProfileDetailsService) private readonly service: GoogleProfileDetailsService) {}

  @Get()
  @ApiOkResponse({ type: CONSUMER.GoogleProfileDetailsResponse })
  @TransformResponse(CONSUMER.GoogleProfileDetailsResponse)
  getConsumerGoogleProfileDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.GoogleProfileDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.googleProfileDetailsId })
  }
}
