import { Module } from '@nestjs/common';

import { AdminDashboardController } from './admin-dashboard.controller';
import { providers } from './providers';

@Module({
  imports: [],
  controllers: [AdminDashboardController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminDashboardModule {}
