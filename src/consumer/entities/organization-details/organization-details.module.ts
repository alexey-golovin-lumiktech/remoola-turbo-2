import { forwardRef, Module } from '@nestjs/common'

import { OrganizationDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { OrganizationDetailsService } from './organization-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [OrganizationDetailsRepository, OrganizationDetailsService],
  exports: [OrganizationDetailsRepository, OrganizationDetailsService],
})
export class OrganizationDetailsModule {}
