import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { PersonalDetailsRepository } from './personal-details.repository'
import { PersonalDetailsService } from './personal-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [PersonalDetailsRepository, PersonalDetailsService],
  exports: [PersonalDetailsRepository, PersonalDetailsService],
})
export class PersonalDetailsModule {}
