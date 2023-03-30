import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import * as configValidation from './envs-validation.schema'
import * as knexfile from '../knexfile'
import { KnexModule } from 'nestjs-knex'
import { AdminModule } from './admin/admin.module'
import { ConsumerModule } from './consumer/consumer.module'
import { PassportModule } from '@nestjs/passport'
import { BasicStrategy } from './strategies/auth-basic.strategy'

@Module({
  imports: [
    PassportModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`${process.cwd()}/.env.${process.env.NODE_ENV}`],
      validationSchema: configValidation.validationSchema,
      validationOptions: configValidation.validationOptions
    }),
    KnexModule.forRoot({ config: knexfile[process.env.NODE_ENV] }),
    AdminModule,
    ConsumerModule
  ],
  controllers: [AppController],
  providers: [BasicStrategy],
  exports: []
})
export class AppModule {}
