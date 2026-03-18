import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MailingModule } from '../shared/mailing.module';

@Module({
  imports: [MailingModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
