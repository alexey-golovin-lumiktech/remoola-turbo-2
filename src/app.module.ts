import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AppController } from './app.controller'
import * as configValidation from './envsValidation.schema'
import * as knexfile from '../knexfile'
import { KnexModule } from 'nestjs-knex'
import { AdminModule } from './admin/admin.module'
import { ConsumerModule } from './consumer/consumer.module'
import { constants } from './constants'
import { SharedModulesModule } from './sharedModules/sharedModules.module'
import { LoggerMiddleware } from './middleware/logger.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [constants.ENV_FILE_PATH],
      validationSchema: configValidation.validationSchema,
      validationOptions: configValidation.validationOptions
    }),
    KnexModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return { config: knexfile[configService.get<string>(`NODE_ENV`)] }
      }
    }),
    AdminModule,
    ConsumerModule,
    SharedModulesModule
  ],
  controllers: [AppController],
  exports: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(`*`)
  }
}
