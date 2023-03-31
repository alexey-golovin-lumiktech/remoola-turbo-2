import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AppController } from './app.controller'
import * as configValidation from './envs-validation.schema'
import * as knexfile from '../knexfile'
import { KnexModule } from 'nestjs-knex'
import { AdminModule } from './admin/admin.module'
import { ConsumerModule } from './consumer/consumer.module'
import { PassportModule } from '@nestjs/passport'
import { BasicStrategy } from './strategies/auth-basic.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { constants } from 'src/constants'

@Module({
  imports: [
    PassportModule,
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
    ConsumerModule
  ],
  controllers: [AppController],
  providers: [BasicStrategy, GoogleStrategy],
  exports: []
})
export class AppModule {}
