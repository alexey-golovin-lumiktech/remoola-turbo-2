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
import { LoggerMiddleware } from './middleware/logger.middleware'
import { AppController } from './app.controller'
import * as configValidation from './envs-validation.schema'

const IS_ON_VERCEL = /^true$/i.test(process.env[`IS_ON_VERCEL`])

const localDevelopmentConfigModuleSetup = {
  cache: true,
  expandVariables: true,
  envFilePath: [getEnvPath(process.cwd())],
  validationSchema: configValidation.validationSchema,
  validationOptions: configValidation.validationOptions,
}

const configModuleOptions = { isGlobal: true }
if (IS_ON_VERCEL == false) Object.assign(configModuleOptions, localDevelopmentConfigModuleSetup)

setTimeout(() => {
  console.log(`[configModuleOptions]`, configModuleOptions[`envFilePath`])
}, 3000)

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
        return { apiKey, apiVersion: `2023-08-16` }
      },
    }),
    CommonSharedModulesModule,
    AdminCommonModule,
    ConsumerCommonModule,
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
