import { Module } from '@nestjs/common'

import { ResourceModule } from '../../../common-shared-modules/resource/resource.module'

import { ConsumerResourceRepository } from './consumer-resource.repository'
import { ConsumerResourceService } from './consumer-resource.service'

@Module({
  imports: [ResourceModule],
  providers: [ConsumerResourceRepository, ConsumerResourceService],
  exports: [ConsumerResourceRepository, ConsumerResourceService],
})
export class ConsumerResourceModule {}
