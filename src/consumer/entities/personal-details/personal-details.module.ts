import { forwardRef, Module } from '@nestjs/common'

import { PersonalDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { PersonalDetailsController } from './personal-details.controller'
import { PersonalDetailsService } from './personal-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  controllers: [PersonalDetailsController],
  providers: [PersonalDetailsRepository, PersonalDetailsService],
  exports: [PersonalDetailsRepository, PersonalDetailsService],
})
export class PersonalDetailsModule {}
