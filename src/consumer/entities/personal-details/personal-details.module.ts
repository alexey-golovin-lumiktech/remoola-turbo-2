import { Module } from '@nestjs/common'

import { PersonalDetailsRepository } from './personal-details.repository'
import { PersonalDetailsService } from './personal-details.service'

@Module({
  providers: [PersonalDetailsRepository, PersonalDetailsService],
  exports: [PersonalDetailsRepository, PersonalDetailsService],
})
export class PersonalDetailsModule {}
