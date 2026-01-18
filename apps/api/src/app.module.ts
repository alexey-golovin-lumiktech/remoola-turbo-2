import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConsumerModule } from './consumer/consumer.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './shared/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // requests per ttl
        ignoreUserAgents: [/googlebot/i, /bingbot/i, /slurp/i],
      },
      {
        ttl: 3600000, // 1 hour
        limit: 1000, // requests per ttl
        ignoreUserAgents: [/googlebot/i, /bingbot/i, /slurp/i],
      },
    ]),
    RouterModule.register([
      { path: `admin`, module: AdminModule },
      { path: `consumer`, module: ConsumerModule },
    ]),
  ],
})
export class AppModule {}
