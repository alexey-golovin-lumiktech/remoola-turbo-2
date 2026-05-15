import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminV2Module } from './admin-v2/admin-v2.module';
import { JwtPassportModule } from './auth/jwt-passport.module';
import {
  ConsumerActionInterceptor,
  CorrelationIdMiddleware,
  LoggingInterceptor,
  PrismaExceptionFilter,
  SqlValidationExceptionFilter,
} from './common';
import { DeviceIdMiddleware } from './common/middleware/device-id.middleware';
import { ConsumerModule } from './consumer/consumer.module';
import { AuthGuard } from './guards';
import { AuthIdentityRepository } from './guards/auth-identity.repository';
import { AuthSessionRepository } from './guards/auth-session.repository';
import { HealthModule } from './health/health.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { TransformResponseInterceptor } from './interceptors';
import { AuthAuditModule } from './shared/auth-audit.module';
import { DatabaseModule } from './shared/database.module';

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
      { ttl: 60000, limit: 100 },
      { ttl: 3600000, limit: 1000 },
    ]),
  ],
  providers: [
    CorrelationIdMiddleware,
    DeviceIdMiddleware,
    AuthSessionRepository,
    AuthIdentityRepository,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ConsumerActionInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: SqlValidationExceptionFilter,
    },
  ],
})
export class AppModule {}
