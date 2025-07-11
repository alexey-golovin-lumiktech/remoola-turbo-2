import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { KnexModule } from 'nestjs-knex'
import { StripeModule } from 'nestjs-stripe'

import * as knexfile from '../knexfile'

import { AdminCommonModule } from './admin/admin-common.module'
import { CommonSharedModulesModule } from './common-shared-modules/common-shared-modules.module'
import { ConsumerCommonModule } from './consumer/consumer-common.module'
import { HealthModule } from './health/health.module'
import { LoggerMiddleware } from './middleware/logger.middleware'
import { AppController } from './app.controller'
import { envs } from './envs'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    KnexModule.forRootAsync({ useFactory: () => ({ config: knexfile[envs.NODE_ENV] }) }),
    StripeModule.forRootAsync({ useFactory: () => ({ apiKey: envs.STRIPE_SECRET_KEY, apiVersion: `2024-04-10` }) }),
    CommonSharedModulesModule,
    AdminCommonModule,
    ConsumerCommonModule,
    HealthModule,
  ],
  controllers: [AppController],
  exports: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(`*`)
  }
}
