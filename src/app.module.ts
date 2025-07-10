import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { KnexModule } from 'nestjs-knex'
import { StripeModule } from 'nestjs-stripe'

import { getEnvPath } from '@wirebill/shared-common/utils'

import * as knexfile from '../knexfile'

import { AdminCommonModule } from './admin/admin-common.module'
import { CommonSharedModulesModule } from './common-shared-modules/common-shared-modules.module'
import { ConsumerCommonModule } from './consumer/consumer-common.module'
import { HealthModule } from './health/health.module'
import { LoggerMiddleware } from './middleware/logger.middleware'
import { AppController } from './app.controller'
import * as configValidation from './envs-validation.schema'

const developmentConfigModuleSetup = {
  cache: true,
  expandVariables: true,
  envFilePath: [getEnvPath(process.cwd())],
  validationSchema: configValidation.validationSchema,
  validationOptions: configValidation.validationOptions,
}

const configModuleOptions = { isGlobal: true }
if (Object.keys(process.env).some(x => x.startsWith(`VERCEL_`))) Object.assign(configModuleOptions, developmentConfigModuleSetup)

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(configModuleOptions),
    KnexModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return { config: knexfile[configService.get<string>(`NODE_ENV`)] }
      },
    }),
    StripeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>(`STRIPE_SECRET_KEY`)
        return { apiKey, apiVersion: `2024-04-10` }
      },
    }),
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
