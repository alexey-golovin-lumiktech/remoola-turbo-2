import { Module } from '@nestjs/common';

import { AdminV2Controller } from './admin-v2.controller';
import { AdminAuthModule } from '../admin/auth/admin-auth.module';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { AdminV2AuditModule } from './audit/admin-v2-audit.module';
import { AdminV2AuthController } from './auth/admin-v2-auth.controller';
import { AdminV2ConsumersModule } from './consumers/admin-v2-consumers.module';

@Module({
  imports: [AdminAuthModule, AdminV2ConsumersModule, AdminV2AuditModule],
  controllers: [AdminV2Controller, AdminV2AuthController],
  providers: [OriginResolverService],
})
export class AdminV2Module {}
