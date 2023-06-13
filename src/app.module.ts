import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { KnexModule } from 'nestjs-knex'
import { StripeModule } from 'nestjs-stripe'

import * as knexfile from '../knexfile'

import { AdminModule } from './admin/admin.module'
import { ConsumerModule } from './consumer/consumer.module'
import { LoggerMiddleware } from './middleware/logger.middleware'
import { SharedModulesModule } from './shared-modules/shared-modules.module'
import { AppController } from './app.controller'
import * as constants from './constants'
import * as configValidation from './envs-validation.schema'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      cache: true,
      expandVariables: true,
      isGlobal: true,
      envFilePath: [constants.ENV_FILE_PATH],
      validationSchema: configValidation.validationSchema,
      validationOptions: configValidation.validationOptions,
    }),
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
        const apiVersion = `2022-11-15`
        return { apiKey, apiVersion }
      },
    }),
    AdminModule,
    ConsumerModule,
    SharedModulesModule,
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
