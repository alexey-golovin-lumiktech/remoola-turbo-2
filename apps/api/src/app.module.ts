import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ormConfig } from './config/orm.config';
import { CoreDatabaseModule } from './core/database.module';
import { SharedModule } from './shared/shared.module';
import { CookieToAuthMiddleware } from './v1/auth/cookie-to-auth.middleware';
import { V1Module } from './v1/v1.module';
import { V2Module } from './v2/v2.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(ormConfig),
    CoreDatabaseModule,
    SharedModule,
    V1Module,
    V2Module,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CookieToAuthMiddleware).forRoutes(`*splat`);
  }
}
