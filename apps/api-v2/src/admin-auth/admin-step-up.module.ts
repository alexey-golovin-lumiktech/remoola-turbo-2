import { Module } from '@nestjs/common';

import { AdminIdentityRepository } from './admin-identity.repository';
import { AdminStepUpService } from './admin-step-up.service';
import { DatabaseModule } from '../shared/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AdminIdentityRepository, AdminStepUpService],
  exports: [AdminStepUpService, AdminIdentityRepository],
})
export class AdminStepUpModule {}
