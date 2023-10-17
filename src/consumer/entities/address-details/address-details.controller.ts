import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors'

import { IConsumerModel } from '@wirebill/shared-common/models'

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
