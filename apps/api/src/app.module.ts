import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConsumerModule } from './consumer/consumer.module';
import { DatabaseModule } from './shared/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RouterModule.register([
      { path: `admin`, module: AdminModule },
      { path: `consumer`, module: ConsumerModule },
    ]),
    AdminModule,
    ConsumerModule,
  ],
})
export class AppModule {}
