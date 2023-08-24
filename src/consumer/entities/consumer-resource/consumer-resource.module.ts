import { forwardRef, Module } from '@nestjs/common'
import { ResourceModule } from 'src/common-shared-modules/resource/resource.module'

import { ConsumerModule } from '../consumer/consumer.module'

import { ConsumerResourceRepository } from './consumer-resource.repository'
import { ConsumerResourceService } from './consumer-resource.service'

@Module({
  imports: [ResourceModule, forwardRef(() => ConsumerModule)],
  providers: [ConsumerResourceRepository, ConsumerResourceService],
  exports: [ConsumerResourceRepository, ConsumerResourceService],
})
export class ConsumerResourceModule {}
