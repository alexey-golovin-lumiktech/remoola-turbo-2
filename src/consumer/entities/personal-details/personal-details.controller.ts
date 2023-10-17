import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { PersonalDetailsService } from './personal-details.service'

@ApiTags(`consumer`)
@ApiTags(`personal-details`)
@ApiBearerAuth()
@Controller(`consumer/personal-details`)
export class PersonalDetailsController {
  constructor(@Inject(PersonalDetailsService) private readonly service: PersonalDetailsService) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.PersonalDetailsResponse })
  @TransformResponse(CONSUMER.PersonalDetailsResponse)
  getConsumerPersonalDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.PersonalDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.personalDetailsId })
  }
}
