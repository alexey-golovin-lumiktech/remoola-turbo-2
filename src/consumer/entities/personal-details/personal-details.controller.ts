import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors'

import { IConsumerModel } from '@wirebill/shared-common/models'

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
