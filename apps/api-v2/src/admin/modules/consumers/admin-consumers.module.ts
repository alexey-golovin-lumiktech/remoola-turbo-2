import { Module } from '@nestjs/common';

import { AdminConsumersController } from './admin-consumers.controller';
import { providers } from './providers';

@Module({
  imports: [],
  controllers: [AdminConsumersController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminConsumersModule {}
