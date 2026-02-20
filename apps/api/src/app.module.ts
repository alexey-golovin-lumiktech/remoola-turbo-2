import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConsumerModule } from './consumer/consumer.module';
import { HealthModule } from './health/health.module';
import { AuthAuditModule } from './shared/auth-audit.module';
import { DatabaseModule } from './shared/database.module';

const botPatterns = [/googlebot/i, /bingbot/i, /slurp/i];

@Module({
  imports: [
    DatabaseModule,
    AuthAuditModule,
    AuthModule,
    HealthModule,
    AdminModule,
    ConsumerModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100, ignoreUserAgents: botPatterns },
      { ttl: 3600000, limit: 1000, ignoreUserAgents: botPatterns },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
