import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@ApiBearerAuth()
@Controller(`consumer`)
export class ConsumerController {
  constructor(@Inject(ConsumerService) private readonly service: ConsumerService) {}

  @Get()
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): CONSUMER.ConsumerResponse {
    return identity
  }
}
