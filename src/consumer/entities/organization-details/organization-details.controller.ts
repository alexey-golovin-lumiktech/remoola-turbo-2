import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { OrganizationDetailsService } from './organization-details.service'

@ApiTags(`consumer`)
@ApiTags(`organization-details`)
@ApiBearerAuth()
@Controller(`consumer/organization-details`)
export class OrganizationDetailsController {
  constructor(@Inject(OrganizationDetailsService) private readonly service: OrganizationDetailsService) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.OrganizationDetailsResponse })
  @TransformResponse(CONSUMER.OrganizationDetailsResponse)
  getConsumerOrganizationDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.OrganizationDetailsResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: identity.organizationDetailsId })
  }
}
