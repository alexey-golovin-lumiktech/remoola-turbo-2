import { forwardRef, Module } from '@nestjs/common'

import { OrganizationDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { OrganizationDetailsController } from './organization-details.controller'
import { OrganizationDetailsService } from './organization-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  controllers: [OrganizationDetailsController],
  providers: [OrganizationDetailsRepository, OrganizationDetailsService],
  exports: [OrganizationDetailsRepository, OrganizationDetailsService],
})
export class OrganizationDetailsModule {}
