import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { KnexModule } from 'nestjs-knex'
import { StripeModule } from 'nestjs-stripe'

import * as knexfile from '../knexfile'

import { AdminModule } from 'src/admin/admin.module'
import { AppController } from 'src/app.controller'
import { constants } from 'src/constants'
import { ConsumerModule } from 'src/consumer/consumer.module'
import * as configValidation from 'src/envs-validation.schema'
import { LoggerMiddleware } from 'src/middleware/logger.middleware'
import { SharedModulesModule } from 'src/shared-modules/shared-modules.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
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
