import { Module } from '@nestjs/common';

import { AdminLedgersController } from './admin-ledger.controller';
import { providers } from './providers';

@Module({
  imports: [],
  controllers: [AdminLedgersController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminLedgersModule {}
