import { Module } from '@nestjs/common';

import { ConsumerProfileController } from './consumer-profile.controller';
import { ConsumerProfileService } from './consumer-profile.service';
import { AuthAuditModule } from '../../../shared/auth-audit.module';

@Module({
  imports: [AuthAuditModule],
  controllers: [ConsumerProfileController],
  providers: [ConsumerProfileService],
  exports: [ConsumerProfileService],
})
export class ConsumerProfileModule {}
