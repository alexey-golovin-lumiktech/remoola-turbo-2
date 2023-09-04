import { forwardRef, Module } from '@nestjs/common'

import { PersonalDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { PersonalDetailsService } from './personal-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [PersonalDetailsRepository, PersonalDetailsService],
  exports: [PersonalDetailsRepository, PersonalDetailsService],
})
export class PersonalDetailsModule {}
