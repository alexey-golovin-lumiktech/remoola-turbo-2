import { Module } from '@nestjs/common';

import { InternalCronGuard } from '../common';
import { HealthDatabaseProbe } from './health-database.probe';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MailingModule } from '../shared/mailing.module';

@Module({
  imports: [MailingModule],
  controllers: [HealthController],
  providers: [HealthDatabaseProbe, HealthService, InternalCronGuard],
})
export class HealthModule {}
