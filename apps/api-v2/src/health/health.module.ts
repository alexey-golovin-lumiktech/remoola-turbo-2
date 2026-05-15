import { Module } from '@nestjs/common';

import { HealthDatabaseProbe } from './health-database.probe';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MailingModule } from '../shared/mailing.module';

@Module({
  imports: [MailingModule],
  controllers: [HealthController],
  providers: [HealthDatabaseProbe, HealthService],
})
export class HealthModule {}
