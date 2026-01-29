import { Module } from '@nestjs/common';

import { AdminAdminsController } from './admin-admins.controller';
import { providers } from './providers';

@Module({
  imports: [],
  controllers: [AdminAdminsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminAdminsModule {}
