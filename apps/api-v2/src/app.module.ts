import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminV2Module } from './admin-v2/admin-v2.module';
import { JwtPassportModule } from './auth/jwt-passport.module';
import { ConsumerModule } from './consumer/consumer.module';
import { HealthModule } from './health/health.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuthAuditModule } from './shared/auth-audit.module';
import { DatabaseModule } from './shared/database.module';

const botPatterns = [/googlebot/i, /bingbot/i, /slurp/i];

@Module({
  imports: [
    DatabaseModule,
    AuthAuditModule,
    JwtPassportModule,
    HealthModule,
    AdminV2Module,
    ConsumerModule,
    ScheduleModule.forRoot(),
    InfrastructureModule,
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
