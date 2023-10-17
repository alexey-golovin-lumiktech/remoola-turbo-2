import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { AddressDetailsService } from './address-details.service'

@ApiTags(`consumer`)
@ApiTags(`address-details`)
@ApiBearerAuth()
@Controller(`consumer/address-details`)
export class AddressDetailsController {
  constructor(@Inject(AddressDetailsService) private readonly service: AddressDetailsService) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.AddressDetailsResponse })
  @TransformResponse(CONSUMER.AddressDetailsResponse)
  getConsumerAddressDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.AddressDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.addressDetailsId })
  }
}
