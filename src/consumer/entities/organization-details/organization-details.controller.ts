import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { OrganizationDetailsService } from './organization-details.service'

@ApiTags(`consumer`)
@ApiTags(`organization-details`)
@ApiBearerAuth()
@Controller(`consumer/organization-details`)
export class OrganizationDetailsController {
  constructor(@Inject(OrganizationDetailsService) private readonly service: OrganizationDetailsService) {}

  @Get()
  @ApiOkResponse({ type: CONSUMER.OrganizationDetailsResponse })
  @TransformResponse(CONSUMER.OrganizationDetailsResponse)
  getConsumerOrganizationDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.OrganizationDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.organizationDetailsId })
  }
}
